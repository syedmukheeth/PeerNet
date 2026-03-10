'use strict';

const Reel = require('../models/Reel');
const Like = require('../models/Like');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');

const createReel = async (userId, { caption, tags }, file) => {
    if (!file) throw new ApiError(400, 'Video file is required');

    const { secure_url, public_id } = await uploadToCloudinary(file.buffer, {
        folder: 'peernet/reels',
        resource_type: 'video',
        eager: [{ format: 'jpg', start_offset: '0' }], // thumbnail
        eager_async: true,
    });

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    const reel = await Reel.create({
        author: userId,
        videoUrl: secure_url,
        videoPublicId: public_id,
        caption: caption || '',
        tags: parsedTags,
    });

    return reel;
};

const getReelsFeed = async ({ limit = 20, cursor = null }) => {
    const query = {};
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const reels = await Reel.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = reels.length > limit;
    const results = hasMore ? reels.slice(0, limit) : reels;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: results, nextCursor, hasMore };
};

const deleteReel = async (reelId, userId) => {
    const reel = await Reel.findById(reelId);
    if (!reel) throw new ApiError(404, 'Reel not found');
    if (reel.author.toString() !== userId.toString()) throw new ApiError(403, 'Not authorised');
    await deleteFromCloudinary(reel.videoPublicId, 'video');
    await reel.deleteOne();
};

const likeReel = async (reelId, userId) => {
    await Reel.findById(reelId).orFail(new ApiError(404, 'Reel not found'));
    try {
        await Like.create({ user: userId, targetId: reelId, targetModel: 'Reel' });
        await Reel.findByIdAndUpdate(reelId, { $inc: { likesCount: 1 } });
        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikeReel = async (reelId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: reelId, targetModel: 'Reel' });
    if (!like) throw new ApiError(404, 'Not liked');
    await Reel.findByIdAndUpdate(reelId, { $inc: { likesCount: -1 } });
    return { liked: false };
};

module.exports = { createReel, getReelsFeed, deleteReel, likeReel, unlikeReel };
