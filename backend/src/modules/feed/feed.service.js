'use strict';

const Post = require('../post/Post');
const Like = require('../post/Like');
const SavedPost = require('../post/SavedPost');
const Follower = require('../user/Follower');
const postService = require('../post/post.service');
const { getRedisOptional } = require('../../config/redis');
const { calculateScore, MinHeap } = require('../../utils/rank.utils');

const MAX_FEED_SIZE = 500;
const HYDRATE_TIMEFRAME_DAYS = 30;

/**
 * Ranked Feed System:
 * 1. Tries to fetch ranked post IDs from Redis Sorted Set (ZSET).
 * 2. If Redis is cold, hydrates from MongoDB using a ranking algorithm.
 * 3. Enriches post objects with user-specific data (isLiked, isSaved).
 */
const getFeed = async (userId, { limit = 20, page = 1 }) => {
    const redis = getRedisOptional();
    const redisKey = `feed:user:${userId}`;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let postIds = [];
    if (redis) {
        // Try getting IDs from ranked sorted set
        postIds = await redis.zRange(redisKey, start, end, { REV: true });
        
        // If empty, hydrate the cache
        if (postIds.length === 0 && page === 1) {
            await hydrateFeed(userId);
            postIds = await redis.zRange(redisKey, start, end, { REV: true });
        }
    }

    // Fallback or Cold Cache Hydration: If still no IDs, we fetch directly from DB (simpler version or force hydration)
    if (postIds.length === 0) {
        // This might happen if user follows no one or no one posted in 30 days
        return { data: [], hasMore: false };
    }

    // Fetch actual post documents using bulk cache-aside logic
    const rankedResults = await postService.getPostsByIds(postIds);

    // Enrich with user-specific likes/saves
    const enrichedResults = await _enrichPosts(rankedResults, userId);

    const totalInFeed = redis ? await redis.zCard(redisKey) : rankedResults.length;
    const hasMore = start + limit < totalInFeed;

    return { data: enrichedResults, hasMore };
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

    // 2. Fetch recent posts from authors
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HYDRATE_TIMEFRAME_DAYS);

    const posts = await Post.find({
        author: { $in: followingIds },
        createdAt: { $gt: cutoff },
        isArchived: false
    }).lean();

    // 3. Rank posts using Min-Heap to find top K
    const heap = new MinHeap(MAX_FEED_SIZE);
    posts.forEach(p => {
        const score = calculateScore(p.likesCount || 0, p.commentsCount || 0, p.createdAt);
        heap.push({ id: p._id.toString(), score });
    });

    const topPosts = heap.toArray();
    
    // 4. Batch push to Redis
    const redisKey = `feed:user:${userId}`;
    if (topPosts.length > 0) {
        const pipeline = redis.multi();
        pipeline.del(redisKey);
        topPosts.forEach(item => {
            pipeline.zAdd(redisKey, { score: item.score, value: item.id });
        });
        pipeline.expire(redisKey, 86400 * 7); // Cache for 7 days
        await pipeline.exec();
    }
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
