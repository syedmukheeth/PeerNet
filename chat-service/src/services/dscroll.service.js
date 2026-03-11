'use strict';

const Dscroll = require('../models/Dscroll');
const Like = require('../models/Like');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');

const createDscroll = async (userId, { caption, tags }, file) => {
    if (!file) throw new ApiError(400, 'Video file is required');

    const { secure_url, public_id } = await uploadToCloudinary(file.buffer, {
        folder: 'peernet/dscrolls',
        resource_type: 'video',
        eager: [{ format: 'jpg', start_offset: '0' }], // thumbnail
        eager_async: true,
    });

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

    return dscroll;
};

const getDscrollsFeed = async ({ limit = 20, cursor = null }) => {
    const query = {};
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const dscrolls = await Dscroll.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = dscrolls.length > limit;
    const results = hasMore ? dscrolls.slice(0, limit) : dscrolls;
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
    await Dscroll.findById(dscrollId).orFail(new ApiError(404, 'Dscroll not found'));
    try {
        await Like.create({ user: userId, targetId: dscrollId, targetModel: 'Dscroll' });
        await Dscroll.findByIdAndUpdate(dscrollId, { $inc: { likesCount: 1 } });
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
