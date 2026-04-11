'use strict';

const Post = require('../post/Post');
const Dscroll = require('./Dscroll');
const Like = require('../post/Like');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');
const { getRedisOptional } = require('../../config/redis');

const createDscroll = async (userId, { caption, tags }, file) => {
    if (!file) throw new ApiError(400, 'Video file is required');

    console.log('[DscrollService] createDscroll start');
    console.log('[DscrollService] file:', { path: file.path, mimetype: file.mimetype, size: file.size, originalname: file.originalname });

    let uploadResult;
    try {
        uploadResult = await uploadToCloudinary(file.path, {
            folder: 'peernet/dscrolls',
            resource_type: 'video',
        });
        console.log('[DscrollService] Cloudinary upload success:', uploadResult.secure_url);
    } catch (cloudErr) {
        console.error('[DscrollService] Cloudinary upload FAILED:', cloudErr.message);
        throw cloudErr;
    }

    const { secure_url, public_id } = uploadResult;

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    const post = await Post.create({
        author: userId,
        mediaUrl: secure_url,
        mediaPublicId: public_id,
        mediaType: 'video',
        caption: caption || '',
        tags: parsedTags,
    });

    const User = require('../user/User');
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    const redis = getRedisOptional();
    if (redis) {
        try {
            const keys = await redis.keys(`feed:${userId}:cursor:*`);
            if (keys.length) await redis.del(keys);
        } catch (e) {
            console.error('Failed to clear feed cache on new dscroll', e);
        }
    }

    return post;
};

const getDscrollsFeed = async ({ limit = 20, cursor = null, userId = null }) => {
    const query = { mediaType: 'video', isArchived: false };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const posts = await Post.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

    let likedSet = new Set();
    if (userId && posts.length > 0) {
        const ids = posts.map((p) => p._id);
        const likes = await Like.find({ user: userId, targetId: { $in: ids }, targetModel: 'Post' }).lean();
        likedSet = new Set(likes.map((l) => l.targetId.toString()));
    }

    const hasMore = posts.length > limit;
    const results = (hasMore ? posts.slice(0, limit) : posts).map((p) => ({
        ...p,
        mediaUrl: p.mediaUrl,
        isLiked: likedSet.has(p._id.toString()),
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
