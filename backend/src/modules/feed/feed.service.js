'use strict';

const Post = require('../post/Post');
const Like = require('../post/Like');
const SavedPost = require('../post/SavedPost');
const Follower = require('../user/Follower');
const { getRedisOptional } = require('../../config/redis');

const FEED_CACHE_TTL = 300; // 5 mins (extended to reduce database hits)

/**
 * Pull-model feed: fetch posts from users the requestor follows.
 * Cursor = ISO date of the last post's createdAt.
 * isLiked and isSaved are computed per-user and NOT cached (they are per-user).
 */
const getFeed = async (userId, { limit = 20, cursor = null }) => {
    const redis = getRedisOptional();
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
        const followRelations = await Follower.find({ follower: userId }).select('following').lean();
        const followingIds = followRelations.map((f) => f.following);

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

    return { data: enrichedResults, nextCursor, hasMore };
};

module.exports = { getFeed };
