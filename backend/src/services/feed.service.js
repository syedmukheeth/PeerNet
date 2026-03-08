'use strict';

const Post = require('../models/Post');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');
const Follower = require('../models/Follower');
const { getRedis } = require('../config/redis');

const FEED_CACHE_TTL = 60; // 1 min (reduced so like state stays fresh)

/**
 * Pull-model feed: fetch posts from users the requestor follows.
 * Cursor = ISO date of the last post's createdAt.
 * isLiked and isSaved are computed per-user and NOT cached (they are per-user).
 */
const getFeed = async (userId, { limit = 20, cursor = null }) => {
    const redis = getRedis();
    // Only cache the raw post list, not per-user flags
    const cacheKey = `feed:${userId}:cursor:${cursor || 'start'}`;

    let results, nextCursor, hasMore;
    let cachedData = null;

    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                cachedData = JSON.parse(cached);
                results = cachedData.results;
                nextCursor = cachedData.nextCursor;
                hasMore = cachedData.hasMore;
            }
        } catch (err) {
            console.error('Redis cache get error:', err);
        }
    }

    if (!cachedData) {
        // Resolve who the user follows
        const followRelations = await Follower.find({ follower: userId }).select('following').lean();
        const followingIds = followRelations.map((f) => f.following);

        // Include own posts in feed
        followingIds.push(userId);

        const query = { author: { $in: followingIds }, isArchived: false };
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        const posts = await Post.find(query)
            .populate('author', 'username fullName avatarUrl isVerified')
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        hasMore = posts.length > limit;
        results = hasMore ? posts.slice(0, limit) : posts;
        nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify({ results, nextCursor, hasMore }), { EX: FEED_CACHE_TTL });
            } catch (err) {
                console.error('Redis cache set error:', err);
            }
        }
    }

    // ── Attach isLiked & isSaved per post for this user ──────────────────────
    const postIds = results.map((p) => p._id);

    const [likedDocs, savedDocs] = await Promise.all([
        Like.find({ user: userId, targetId: { $in: postIds }, targetModel: 'Post' }).select('targetId').lean(),
        SavedPost.find({ user: userId, post: { $in: postIds } }).select('post').lean(),
    ]);

    const likedSet = new Set(likedDocs.map((l) => l.targetId.toString()));
    const savedSet = new Set(savedDocs.map((s) => s.post.toString()));

    const enrichedResults = results.map((p) => ({
        ...p,
        isLiked: likedSet.has(p._id.toString()),
        isSaved: savedSet.has(p._id.toString()),
    }));
    // ─────────────────────────────────────────────────────────────────────────

    return { data: enrichedResults, nextCursor, hasMore };
};

module.exports = { getFeed };
