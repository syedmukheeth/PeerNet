'use strict';

const Post = require('../post/Post');
const Dscroll = require('./Dscroll');
const Like = require('../post/Like');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');
const User = require('../user/User');
const { getRedisOptional } = require('../../config/redis');
const logger = require('../../config/logger');

const createDscroll = async (userId, { caption, tags }, file) => {
    if (!file) throw new ApiError(400, 'Video file is required');

    if (!file) throw new ApiError(400, 'Video file is required');

    let uploadResult;
    try {
        uploadResult = await uploadToCloudinary(file.path, {
            folder: 'peernet/dscrolls',
            resource_type: 'video',
        });
        logger.info(`DscrollService: Cloudinary upload success - ${uploadResult.secure_url}`);
    } catch (cloudErr) {
        logger.error(`DscrollService: Cloudinary upload FAILED - ${cloudErr.message}`);
        throw cloudErr;
    }

    const { secure_url, public_id } = uploadResult;

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    const dscroll = await Dscroll.create({
        author: userId,
        videoUrl: secure_url,
        videoPublicId: public_id,
        caption: caption || '',
        tags: parsedTags,
    });

    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    // Notify via Event Bus (Optional - if Dscroll creation triggers notifications)
    // publishEvent('dscroll_events', 'DSCROLL_CREATED', { dscrollId: dscroll._id, authorId: userId });

    const redis = getRedisOptional();
    if (redis) {
        try {
            const keys = await redis.keys(`feed:${userId}:cursor:*`);
            if (keys.length) await redis.del(keys);
        } catch (e) {
            logger.error(`DscrollService: Failed to clear feed cache - ${e.message}`);
        }
    }

    return dscroll;
};

const getDscrollsFeed = async ({ limit = 20, cursor = null, userId = null }) => {
    const query = {};
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const dscrolls = await Dscroll.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

    let likedSet = new Set();
    if (userId && dscrolls.length > 0) {
        const ids = dscrolls.map((d) => d._id);
        const likes = await Like.find({ user: userId, targetId: { $in: ids }, targetModel: 'Dscroll' }).lean();
        likedSet = new Set(likes.map((l) => l.targetId.toString()));
    }

    const hasMore = dscrolls.length > limit;
    const results = (hasMore ? dscrolls.slice(0, limit) : dscrolls).map((d) => ({
        ...d,
        mediaUrl: d.videoUrl, // Map to mediaUrl for frontend compatibility
        mediaType: 'video',
        isLiked: likedSet.has(d._id.toString()),
    }));

    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: results, nextCursor, hasMore };
};

const deleteDscroll = async (dscrollId, userId) => {
    const dscroll = await Dscroll.findById(dscrollId);
    if (!dscroll) throw new ApiError(404, 'Dscroll not found');
    if (dscroll.author.toString() !== userId.toString()) throw new ApiError(403, 'Not authorised');
    await deleteFromCloudinary(dscroll.videoPublicId, 'video');
    await dscroll.deleteOne();
};

const likeDscroll = async (dscrollId, userId) => {
    const dscroll = await Dscroll.findById(dscrollId).orFail(new ApiError(404, 'Dscroll not found'));
    try {
        await Like.create({ user: userId, targetId: dscrollId, targetModel: 'Dscroll' });
        await Dscroll.findByIdAndUpdate(dscrollId, { $inc: { likesCount: 1 } });

        // Notify via Event Bus
        publishEvent('dscroll_events', 'DSCROLL_LIKED', {
            dscrollId,
            userId,
            authorId: dscroll.author
        });

        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikeDscroll = async (dscrollId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: dscrollId, targetModel: 'Dscroll' });
    if (!like) throw new ApiError(404, 'Not liked');
    await Dscroll.findByIdAndUpdate(dscrollId, { $inc: { likesCount: -1 } });
    return { liked: false };
};

module.exports = { createDscroll, getDscrollsFeed, deleteDscroll, likeDscroll, unlikeDscroll };
