'use strict';

const Short = require('./Short');
const Like = require('../post/Like');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');
const User = require('../user/User');
const { getRedisOptional } = require('../../config/redis');
const logger = require('../../config/logger');
const notificationService = require('../notification/notification.service');

const createShort = async (userId, { caption, tags }, file) => {
    if (!file) throw new ApiError(400, 'Video file is required');

    let uploadResult;
    try {
        uploadResult = await uploadToCloudinary(file.path, {
            folder: 'peernet/shorts',
            resource_type: 'video',
        });
        logger.info(`ShortsService: Cloudinary upload success - ${uploadResult.secure_url}`);
    } catch (cloudErr) {
        logger.error(`ShortsService: Cloudinary upload FAILED - ${cloudErr.message}`);
        throw cloudErr;
    }

    const { secure_url, public_id } = uploadResult;

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    const short = await Short.create({
        author: userId,
        videoUrl: secure_url,
        videoPublicId: public_id,
        caption: caption || '',
        tags: parsedTags,
    });

    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    const redis = getRedisOptional();
    if (redis) {
        try {
            const keys = await redis.keys(`feed:${userId}:cursor:*`);
            if (keys.length) await redis.del(keys);
        } catch (e) {
            logger.error(`ShortsService: Failed to clear feed cache - ${e.message}`);
        }
    }

    return short;
};

const getShortsFeed = async ({ limit = 20, cursor = null, userId = null }) => {
    const query = {};
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const shorts = await Short.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

    let likedSet = new Set();
    if (userId && shorts.length > 0) {
        const ids = shorts.map((s) => s._id);
        const likes = await Like.find({ user: userId, targetId: { $in: ids }, targetModel: 'Short' }).lean();
        likedSet = new Set(likes.map((l) => l.targetId.toString()));
    }

    const hasMore = shorts.length > limit;
    const results = (hasMore ? shorts.slice(0, limit) : shorts).map((s) => ({
        ...s,
        mediaUrl: s.videoUrl, // Map to mediaUrl for frontend compatibility
        mediaType: 'video',
        isLiked: likedSet.has(s._id.toString()),
    }));

    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: results, nextCursor, hasMore };
};

const deleteShort = async (shortId, userId) => {
    const short = await Short.findById(shortId);
    if (!short) throw new ApiError(404, 'Short not found');
    if (short.author.toString() !== userId.toString()) throw new ApiError(403, 'Not authorised');
    await deleteFromCloudinary(short.videoPublicId, 'video');
    await short.deleteOne();
};

const likeShort = async (shortId, userId) => {
    const short = await Short.findById(shortId).orFail(new ApiError(404, 'Short not found'));
    try {
        await Like.create({ user: userId, targetId: shortId, targetModel: 'Short' });
        await Short.findByIdAndUpdate(shortId, { $inc: { likesCount: 1 } });

        if (short.author.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipient: short.author,
                sender: userId,
                type: 'like',
                entityId: shortId,
                entityModel: 'Short'
            });
        }

        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikeShort = async (shortId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: shortId, targetModel: 'Short' });
    if (!like) throw new ApiError(404, 'Not liked');
    await Short.findByIdAndUpdate(shortId, { $inc: { likesCount: -1 } });
    return { liked: false };
};

module.exports = { createShort, getShortsFeed, deleteShort, likeShort, unlikeShort };
