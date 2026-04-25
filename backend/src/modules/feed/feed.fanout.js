'use strict';

const Follower = require('../user/Follower');
const { getRedisOptional } = require('../../config/redis');
const { calculateScore } = require('../../utils/rank.utils');
const logger = require('../../config/logger');

const MAX_FEED_SIZE = 500;

/**
 * Distributes a new post to all followers' feeds.
 * This is a "Push" (Fan-out on Write) approach.
 */
const fanoutPost = async (post) => {
    const redis = getRedisOptional();
    if (!redis) return;

    try {
        const score = calculateScore(post.likesCount || 0, post.commentsCount || 0, post.createdAt);
        const followerDocs = await Follower.find({ following: post.author }).select('follower').lean();
        const followerIds = followerDocs.map(f => f.follower.toString());
        
        // Also add to author's own feed
        followerIds.push(post.author.toString());

        const pipeline = redis.multi();
        followerIds.forEach(uid => {
            const key = `feed:user:${uid}`;
            // Add postId with calculated score
            pipeline.zAdd(key, { score, value: post._id.toString() });
            // Ensure feed doesn't grow indefinitely
            pipeline.zRemRangeByRank(key, 0, -(MAX_FEED_SIZE + 1));
        });

        await pipeline.exec();
    } catch (err) {
        logger.error(`Feed fan-out error: ${err.message}`);
    }
};

/**
 * Updates the score of a post in all relevant feeds (e.g. after a like).
 * Usually done for "hot" posts to move them up.
 */
const updatePostScore = async (post) => {
    const redis = getRedisOptional();
    if (!redis) return;

    try {
        const score = calculateScore(post.likesCount || 0, post.commentsCount || 0, post.createdAt);
        const followerDocs = await Follower.find({ following: post.author }).select('follower').lean();
        const followerIds = followerDocs.map(f => f.follower.toString());
        followerIds.push(post.author.toString());

        const pipeline = redis.multi();
        followerIds.forEach(uid => {
            const key = `feed:user:${uid}`;
            // Only update if it exists in the feed
            pipeline.zAdd(key, { score, value: post._id.toString() }, { XX: true });
        });
        await pipeline.exec();
    } catch (err) {
        logger.error(`Feed score update error: ${err.message}`);
    }
};

module.exports = { fanoutPost, updatePostScore };
