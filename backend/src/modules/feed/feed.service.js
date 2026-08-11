'use strict';

const Post = require('../post/Post');
const Like = require('../post/Like');
const SavedPost = require('../post/SavedPost');
const Follower = require('../user/Follower');
const User = require('../user/User');
const postService = require('../post/post.service');
const { getRedisOptional } = require('../../config/redis');
const { calculateScore, MinHeap } = require('../../utils/rank.utils');
const logger = require('../../config/logger');

const MAX_FEED_SIZE = 500;
// Upper bound on how many candidate posts are pulled into Node to be ranked.
// The followed-user query used to be completely unbounded, so a user following
// active accounts loaded their entire post history into memory on every single
// feed request.
const MAX_CANDIDATE_POOL = 500;
// How far back to look for discovery/global posts (not applied to followed-user posts)
const DISCOVERY_TIMEFRAME_DAYS = 365;

const FEED_CACHE_TTL = 300; // 5 min

/**
 * The feed is ordered by a computed score, not by date, so a createdAt cursor
 * cannot express "everything after this page": it skipped and duplicated posts
 * on every page boundary.
 *
 * The cursor is an offset into the ranked list rather than the score of the
 * last item, because calculateScore decays against Date.now(). Every request
 * recomputes slightly lower scores than the one before it, so a score-valued
 * cursor drifts downwards between pages and re-admits posts the client has
 * already seen. The ranked candidate pool is deterministic and bounded, so an
 * offset over it is stable for the life of a scroll.
 */
const encodeCursor = (offset) => Buffer.from(String(offset)).toString('base64url');

const decodeCursor = (cursor) => {
    if (!cursor) return 0;
    const parsed = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

/**
 * Ranked Feed System:
 * 1. Tries to fetch ranked post IDs from Redis Sorted Set (ZSET).
 * 2. If Redis is cold, hydrates from MongoDB using a ranking algorithm.
 * 3. Enriches post objects with user-specific data (isLiked, isSaved).
 */
const getFeed = async (userId, { limit = 20, cursor = null }) => {
    const redis = getRedisOptional();
    const redisKey = `feed:user:${userId}`;

    // The first page used to del() the key and re-hydrate on every request,
    // which made the ZSET pure overhead: it was never read before being
    // rebuilt. It is now a real cache with a TTL, refreshed only on a miss.
    if (redis && !cursor) {
        try {
            const cached = await redis.exists(redisKey);
            if (!cached) await hydrateFeed(userId);
        } catch (err) {
            logger.warn(`Feed cache check failed, falling back to direct query: ${err.message}`);
        }
    }

    if (redis && !cursor) {
        try {
            const postIds = await redis.zRange(redisKey, 0, limit - 1, { REV: true });
            if (postIds.length > 0) {
                const ranked = await postService.getPostsByIds(postIds);
                const enriched = await _enrichPosts(ranked, userId);
                const hasMore = enriched.length === limit;
                return {
                    data: enriched,
                    hasMore,
                    nextCursor: hasMore ? encodeCursor(enriched.length) : null,
                };
            }
        } catch (err) {
            logger.warn(`Feed cache read failed, falling back to direct query: ${err.message}`);
        }
    }

    return _getDirectFeed(userId, limit, decodeCursor(cursor));
};

/** Attaches the ranking score to each post, applying the user's tag affinity. */
const _withScores = (posts, affinity) =>
    posts.map((p) => {
        let score = calculateScore(p.likesCount || 0, p.commentsCount || 0, p.createdAt);

        // Personalization Boost: If post tags match high-affinity categories
        if (p.tags && p.tags.length > 0) {
            let boost = 0;
            p.tags.forEach((tag) => {
                const weight = affinity?.get ? affinity.get(tag) : affinity?.[tag];
                if (weight) boost += Math.log1p(weight); // Logarithmic growth to prevent saturation
            });
            score *= (1 + boost);
        }

        return { ...p, score };
    });

/**
 * Authors whose posts may appear in the discovery tier.
 *
 * Discovery pulls from the whole platform, so without this it served private
 * accounts' posts to people who do not follow them, which is exactly what
 * isPrivate is supposed to prevent.
 */
const _discoveryExclusions = async (userId, followingIds) => {
    const privateAuthors = await User.find({ isPrivate: true, _id: { $nin: followingIds } })
        .select('_id')
        .lean();
    return [...followingIds, ...privateAuthors.map((u) => u._id)];
};

/**
 * Fills the Redis Sorted Set for a user by fetching posts from followed users,
 * ranking them with a Priority Queue, and pushing to Redis.
 */
const hydrateFeed = async (userId) => {
    const redis = getRedisOptional();
    if (!redis) return;

    // 1. Get following IDs
    const followRelations = await Follower.find({ follower: userId }).select('following').lean();
    const followingIds = followRelations.map(f => f.following);
    followingIds.push(userId); // Include self

    // 2. Fetch User Category Affinities for Personalization
    const user = await User.findById(userId).select('categoryAffinity').lean();
    const affinity = user?.categoryAffinity || new Map();

    // 3. Posts from followed users, newest first, bounded.
    let posts = await Post.find({
        author: { $in: followingIds },
        isArchived: { $ne: true },  // $ne:true also matches docs without the field
        isHidden: { $ne: true },
    })
        .sort({ createdAt: -1 })
        .limit(MAX_CANDIDATE_POOL)
        .lean();

    // 4. Discovery Fallback: If feed is thin, pull global posts from last year
    if (posts.length < 10) {
        const discoveryCutoff = new Date();
        discoveryCutoff.setDate(discoveryCutoff.getDate() - DISCOVERY_TIMEFRAME_DAYS);
        const excluded = await _discoveryExclusions(userId, followingIds);

        const discoveryPosts = await Post.find({
            author: { $nin: excluded },
            isArchived: { $ne: true },
            isHidden: { $ne: true },
            $or: [
                { likesCount: { $gt: 0 } },
                { commentsCount: { $gt: 0 } },
                { createdAt: { $gt: discoveryCutoff } },
            ]
        })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(50)
        .lean();

        posts = [...posts, ...discoveryPosts];
    }

    // 5. Rank posts using Min-Heap to find top K
    const heap = new MinHeap(MAX_FEED_SIZE);
    _withScores(posts, affinity).forEach((p) => {
        heap.push({ id: p._id.toString(), score: p.score });
    });

    const topPosts = heap.toArray();

    // 6. Batch push to Redis
    const redisKey = `feed:user:${userId}`;
    if (topPosts.length > 0) {
        const pipeline = redis.multi();
        pipeline.del(redisKey);
        topPosts.forEach(item => {
            pipeline.zAdd(redisKey, { score: item.score, value: item.id });
        });
        pipeline.expire(redisKey, FEED_CACHE_TTL);
        await pipeline.exec();
    }
};

/**
 * Direct DB Fallback: Fetches posts directly from MongoDB if Redis is empty or offline.
 * Reuses the same ranking logic as hydrateFeed but returns documents immediately.
 *
 * Every tier keeps the isArchived and isHidden filters. There used to be a
 * "nuclear fallback" below these that dropped both, which served archived and
 * moderator-hidden posts, and a "self-heal" step that wrote two hard-coded
 * Unsplash posts into the database when the collection was empty. Both are
 * gone: a GET must not mutate state, and an empty database is an empty feed.
 */
const _getDirectFeed = async (userId, limit, offset) => {
    // 1. Get authors (Following + Self)
    const followRelations = await Follower.find({ follower: userId }).select('following').lean();
    const followingIds = followRelations.map(f => f.following);
    followingIds.push(userId);

    const visible = { isArchived: { $ne: true }, isHidden: { $ne: true } };
    // Private accounts the viewer does not follow are excluded from every tier
    // that reaches outside the follow graph, not just from discovery.
    const excluded = await _discoveryExclusions(userId, followingIds);

    // 2. Candidate pool: posts from followed users (+ self), newest first.
    let posts = await Post.find({ ...visible, author: { $in: followingIds } })
        .sort({ createdAt: -1 })
        .limit(MAX_CANDIDATE_POOL)
        .lean();

    // 3. Discovery pool: if the pool is thin, fill with global content.
    if (posts.length < MAX_CANDIDATE_POOL) {
        const discoveryCutoff = new Date();
        discoveryCutoff.setDate(discoveryCutoff.getDate() - DISCOVERY_TIMEFRAME_DAYS);

        const discovery = await Post.find({
            ...visible,
            author: { $nin: excluded },
            $or: [
                { likesCount: { $gt: 0 } },
                { commentsCount: { $gt: 0 } },
                { createdAt: { $gt: discoveryCutoff } },
            ]
        })
            .sort({ likesCount: -1, createdAt: -1 })
            .limit(MAX_CANDIDATE_POOL - posts.length)
            .lean();

        const seen = new Set(posts.map(p => p._id.toString()));
        discovery.forEach(p => {
            if (!seen.has(p._id.toString())) posts.push(p);
        });
    }

    // 4. Desperation tier: still thin, so take the most recent visible posts.
    //    Still excludes private accounts the viewer does not follow: this tier
    //    used to query with no author filter at all, which leaked them.
    if (posts.length < limit + offset) {
        const fallback = await Post.find({ ...visible, author: { $nin: excluded } })
            .sort({ createdAt: -1 })
            .limit(MAX_CANDIDATE_POOL)
            .lean();

        const seen = new Set(posts.map(p => p._id.toString()));
        fallback.forEach(p => {
            if (!seen.has(p._id.toString())) posts.push(p);
        });
    }

    if (posts.length === 0) {
        return { data: [], hasMore: false, nextCursor: null };
    }

    // 5. Rank, then page on the ranking rather than on date.
    const currentUser = await User.findById(userId).select('categoryAffinity').lean();
    const affinity = currentUser?.categoryAffinity || {};

    // Ties broken by id so the order is total and stable across requests.
    const ranked = _withScores(posts, affinity)
        .sort((a, b) => (b.score - a.score) || a._id.toString().localeCompare(b._id.toString()));

    const page = ranked.slice(offset, offset + limit);
    const hasMore = ranked.length > offset + limit;

    // 6. Populate author: lean() returns raw ObjectIds and the client needs
    //    username/avatarUrl.
    const populated = await Post.find({ _id: { $in: page.map(p => p._id) } })
        .populate('author', 'username fullName avatarUrl isVerified')
        .lean();

    const scoreById = new Map(page.map(p => [p._id.toString(), p.score]));
    const merged = populated
        .map(p => ({ ...p, score: scoreById.get(p._id.toString()) }))
        .sort((a, b) => (b.score - a.score) || a._id.toString().localeCompare(b._id.toString()));

    const data = await _enrichPosts(merged, userId);

    return {
        data,
        hasMore,
        nextCursor: hasMore ? encodeCursor(offset + page.length) : null,
    };
};

/** Private helper to add isLiked and isSaved flags to posts for a specific user */
const _enrichPosts = async (posts, userId) => {
    if (!userId || posts.length === 0) return posts;

    const postIds = posts.map(p => p._id);
    const [likedDocs, savedDocs] = await Promise.all([
        Like.find({ user: userId, targetId: { $in: postIds }, targetModel: 'Post' }).select('targetId').lean(),
        SavedPost.find({ user: userId, post: { $in: postIds } }).select('post').lean(),
    ]);

    const likedSet = new Set(likedDocs.map(l => l.targetId.toString()));
    const savedSet = new Set(savedDocs.map(s => s.post.toString()));

    return posts.map(p => ({
        ...p,
        isLiked: likedSet.has(p._id.toString()),
        isSaved: savedSet.has(p._id.toString()),
    }));
};

module.exports = { getFeed, hydrateFeed };
