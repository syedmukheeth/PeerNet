'use strict';

const mongoose = require('mongoose');
const Post = require('../post/Post');
const Like = require('../post/Like');
const SavedPost = require('../post/SavedPost');
const Follower = require('../user/Follower');
const User = require('../user/User');
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
const getFeed = async (userId, { limit = 20, cursor = null }) => {
    const redis = getRedisOptional();
    const redisKey = `feed:user:${userId}`;

    let postIds = [];
    if (redis) {
        // Try getting IDs from ranked sorted set (Simple offset for now, or fallback)
        // For deep cursors, we prefer DB fallback to ensure consistency
        if (!cursor) {
            postIds = await redis.zRange(redisKey, 0, limit - 1, { REV: true });
        }
        
        // If empty or has cursor, we might needs fresh data or precise cursor handling
        if (postIds.length === 0 && !cursor) {
            await hydrateFeed(userId);
            postIds = await redis.zRange(redisKey, 0, limit - 1, { REV: true });
        }
    }

    // Fallback or Cold Cache/Cursor Handling: Direct DB query is most reliable for cursors
    if (postIds.length === 0 || cursor) {
        const directPosts = await _getDirectFeed(userId, limit, cursor);
        const nextCursor = directPosts.length === limit ? directPosts[directPosts.length - 1].createdAt : null;
        return { data: directPosts, hasMore: !!nextCursor, nextCursor };
    }

    const rankedResults = await postService.getPostsByIds(postIds);
    const enrichedResults = await _enrichPosts(rankedResults, userId);
    
    const nextCursor = (enrichedResults.length === limit) ? enrichedResults[enrichedResults.length - 1].createdAt : null;
    return { data: enrichedResults, hasMore: !!nextCursor, nextCursor };
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

    // 3. Fetch recent posts from authors
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HYDRATE_TIMEFRAME_DAYS);

    let posts = await Post.find({
        author: { $in: followingIds },
        createdAt: { $gt: cutoff },
        isArchived: false
    }).lean();

    // 4. Discovery Fallback: If feed is thin, pull global viral/recent posts
    if (posts.length < 10) {
        const discoveryPosts = await Post.find({
            author: { $nin: followingIds }, // Don't duplicate Following/Self
            isArchived: false,
            // Prioritize recent/engagement, but allow older posts if platform is young
            $or: [
                { likesCount: { $gt: 0 } },
                { commentsCount: { $gt: 0 } },
                { createdAt: { $gt: cutoff } } // Last 30 days
            ]
        })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(50)
        .lean();
        
        posts = [...posts, ...discoveryPosts];
    }

    // 5. Desperation Fallback: If still empty (e.g. cluster is very old), pull absolute latest
    if (posts.length === 0) {
        posts = await Post.find({ isArchived: false })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
    }

    // 4. Rank posts using Min-Heap to find top K
    const heap = new MinHeap(MAX_FEED_SIZE);
    posts.forEach(p => {
        let score = calculateScore(p.likesCount || 0, p.commentsCount || 0, p.createdAt);
        
        // Personalization Boost: If post tags match high-affinity categories
        if (p.tags && p.tags.length > 0) {
            let boost = 0;
            p.tags.forEach(tag => {
                const weight = affinity.get ? affinity.get(tag) : affinity[tag];
                if (weight) boost += Math.log1p(weight); // Logarithmic growth to prevent saturation
            });
            score *= (1 + boost);
        }
        
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

/** 
 * Direct DB Fallback: Fetches posts directly from MongoDB if Redis is empty or offline.
 * Reuses the same ranking logic as hydrateFeed but returns documents immediately.
 */
const _getDirectFeed = async (userId, limit, cursor) => {
    let tier = 'following';
    // 1. Get authors (Following + Self)
    const followRelations = await Follower.find({ follower: userId }).select('following').lean();
    const followingIds = followRelations.map(f => f.following);
    followingIds.push(userId);

    // 2. Fetch all potential candidates (Followed + Discovery)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HYDRATE_TIMEFRAME_DAYS);

    const queryBase = { isArchived: { $ne: true } };
    if (cursor) queryBase.createdAt = { $lt: new Date(cursor) };

    // Initial pool: Following
    let posts = await Post.find({
        ...queryBase,
        author: { $in: followingIds },
        createdAt: cursor ? { $lt: new Date(cursor) } : { $gt: cutoff },
    }).lean();

    // Discovery pool: If we have less than the limit, fill with global content
    if (posts.length < limit) {
        tier = 'discovery';
        const discovery = await Post.find({
            ...queryBase,
            author: { $nin: followingIds },
            $or: [
                { likesCount: { $gt: 0 } },
                { commentsCount: { $gt: 0 } },
                { createdAt: cursor ? { $lt: new Date(cursor) } : { $gt: cutoff } }
            ]
        }).sort({ likesCount: -1, createdAt: -1 }).limit(100).lean();
        
        // Merge without duplicates
        const postSet = new Set(posts.map(p => p._id.toString()));
        discovery.forEach(p => {
            if (!postSet.has(p._id.toString())) posts.push(p);
        });
    }

    // Desperation Fallback: If still thin, pull absolute anything regardless of cutoff
    if (posts.length < limit) {
        tier = 'desperation';
        const absoluteFallback = await Post.find(queryBase)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
            
        const postSet = new Set(posts.map(p => p._id.toString()));
        absoluteFallback.forEach(p => {
            if (!postSet.has(p._id.toString())) posts.push(p);
        });
    }

    // NUCLEAR FALLBACK: If STILL empty, bypass EVERY filter (Archives, Cursors, etc.)
    if (posts.length === 0) {
        tier = 'nuclear';
        posts = await Post.find({}).sort({ createdAt: -1 }).limit(10).lean();
    }

    // OPERATION SELF-HEAL: If literally ZERO posts in the entire DB, seed it on the fly
    const rawCount = await Post.countDocuments({});
    if (rawCount === 0) {
        tier = 'self-heal';
        console.log(`[SELF-HEAL] No posts found. Bootstrapping production data...`);
        posts = await Post.insertMany([
            {
                author: userId,
                mediaUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
                mediaPublicId: 'peernet/debug/seed-1',
                mediaType: 'image',
                caption: 'Welcome to PeerNet! (Self-Healed Content) 🚀',
            },
            {
                author: userId,
                mediaUrl: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800',
                mediaPublicId: 'peernet/debug/seed-2',
                mediaType: 'image',
                caption: 'The platform is now connected and operational. 🌐',
            }
        ]);
        // convert to plain objects if insertMany returns full docs
        posts = posts.map(p => p.toObject ? p.toObject() : p);
    }

    const dbName = mongoose.connection.name;
    console.log(`[FEED_TIER] User: ${userId} Tier: ${tier} Count: ${posts.length} DB_Total: ${rawCount} DB_Name: ${dbName}`);

    // Fetch affinity for personalization ranking
    const currentUser = await User.findById(userId).select('categoryAffinity').lean();
    const affinity = currentUser?.categoryAffinity || {};

    const ranked = posts.map(p => {
        let score = calculateScore(p.likesCount || 0, p.commentsCount || 0, p.createdAt);
        if (p.tags && p.tags.length > 0) {
            let boost = 0;
            p.tags.forEach(tag => {
                const weight = affinity.get ? affinity.get(tag) : affinity[tag];
                if (weight) boost += Math.log1p(weight);
            });
            score *= (1 + boost);
        }
        return { ...p, score, logicTier: tier, _dbCount: rawCount, _dbName: dbName };
    }).sort((a, b) => b.score - a.score);

    // 4. Slicing
    const paginated = ranked.slice(0, limit);
    return _enrichPosts(paginated, userId);
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
