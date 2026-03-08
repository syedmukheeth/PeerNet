'use strict';

const User = require('../models/User');
const Follower = require('../models/Follower');
const { getRedis } = require('../config/redis');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

const USER_CACHE_TTL = 600; // 10 min

const getProfile = async (targetUserId, requestingUserId) => {
    const redis = getRedis();
    const cacheKey = `user:${targetUserId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await User.findById(targetUserId).select('-passwordHash');
    if (!user) throw new ApiError(404, 'User not found');

    let isFollowing = false;
    if (requestingUserId) {
        const relation = await Follower.findOne({ follower: requestingUserId, following: targetUserId });
        isFollowing = Boolean(relation);
    }

    const profile = { ...user.toJSON(), isFollowing };
    await redis.setEx(cacheKey, USER_CACHE_TTL, JSON.stringify(profile));
    return profile;
};

const updateProfile = async (userId, updates, avatarFile) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (avatarFile) {
        // Delete old avatar from Cloudinary
        if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);
        const { secure_url, public_id } = await uploadToCloudinary(avatarFile.buffer, {
            folder: 'peernet/avatars',
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
        });
        user.avatarUrl = secure_url;
        user.avatarPublicId = public_id;
    }

    Object.assign(user, updates);
    await user.save();

    // Invalidate cache
    const redis = getRedis();
    await redis.del(`user:${userId}`);

    return user.toJSON();
};

const follow = async (followerId, followingId) => {
    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, 'You cannot follow yourself');
    }

    const target = await User.findById(followingId);
    if (!target) throw new ApiError(404, 'User not found');

    const existing = await Follower.findOne({ follower: followerId, following: followingId });
    if (existing) throw new ApiError(409, 'Already following this user');

    await Follower.create({ follower: followerId, following: followingId });

    // Increment counters atomically
    await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);

    // Invalidate cached profiles
    const redis = getRedis();
    await redis.del(`user:${followerId}`, `user:${followingId}`);

    // Notify the followed user
    notificationService.createNotification({
        recipient: followingId,
        sender: followerId,
        type: 'follow',
        entityId: followingId,
        entityModel: 'User',
    }).catch(() => { });

    return { message: `Now following @${target.username}` };
};

const unfollow = async (followerId, followingId) => {
    const relation = await Follower.findOneAndDelete({ follower: followerId, following: followingId });
    if (!relation) throw new ApiError(404, 'You are not following this user');

    await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
    ]);

    const redis = getRedis();
    await redis.del(`user:${followerId}`, `user:${followingId}`);

    return { message: 'Unfollowed successfully' };
};

const getFollowers = async (userId, { limit = 20, skip = 0 }) => {
    const followers = await Follower.find({ following: userId })
        .populate('follower', 'username fullName avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    return followers.map((f) => f.follower);
};

const getFollowing = async (userId, { limit = 20, skip = 0 }) => {
    const following = await Follower.find({ follower: userId })
        .populate('following', 'username fullName avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    return following.map((f) => f.following);
};

const searchUsers = async (q, { limit = 20, skip = 0 }) => {
    if (!q || q.trim().length < 2) throw new ApiError(400, 'Query must be at least 2 characters');
    return User.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } },
    )
        .select('username fullName avatarUrl isVerified followersCount')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip);
};

module.exports = { getProfile, updateProfile, follow, unfollow, getFollowers, getFollowing, searchUsers };
