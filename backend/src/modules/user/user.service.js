'use strict';

const User = require('./User');
const Follower = require('./Follower');
const { getRedisOptional } = require('../../config/redis');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');
const notificationService = require('../notification/notification.service');

const USER_CACHE_TTL = 600; // 10 min

// Fields that belong to the account owner and must not be returned when someone
// else views the profile. The cached copy stays complete; stripping happens on
// the way out so the same cache entry serves both the owner and other viewers.
const PRIVATE_PROFILE_FIELDS = [
    'email',
    'lastLogin',
    'lastSeen',
    'status',
    'categoryAffinity',
    'avatarPublicId',
    '__v',
];

const stripPrivateFields = (profile) => {
    const visible = { ...profile };
    PRIVATE_PROFILE_FIELDS.forEach((field) => delete visible[field]);
    return visible;
};

/**
 * Whether requestingUserId is allowed to see targetUserId's content.
 *
 * `isPrivate` existed on the schema but was enforced nowhere, so a private
 * account's posts, followers and following lists were readable by anyone with
 * a login. Follows a permissive-header/restrictive-content split: the profile
 * header stays visible so people can find the account and request to follow it,
 * everything behind it does not.
 */
const canViewContent = async (targetUserId, requestingUserId) => {
    if (requestingUserId && requestingUserId.toString() === targetUserId.toString()) return true;

    const target = await User.findById(targetUserId).select('isPrivate').lean();
    if (!target) throw new ApiError(404, 'User not found');
    if (!target.isPrivate) return true;
    if (!requestingUserId) return false;

    const relation = await Follower.exists({ follower: requestingUserId, following: targetUserId });
    return Boolean(relation);
};

const assertCanViewContent = async (targetUserId, requestingUserId) => {
    if (!(await canViewContent(targetUserId, requestingUserId))) {
        throw new ApiError(403, 'This account is private');
    }
};

const getProfile = async (targetUserId, requestingUserId) => {
    const redis = getRedisOptional();
    const cacheKey = `user:${targetUserId}`;

    let profileData;
    const cached = redis ? await redis.get(cacheKey) : null;
    if (cached) {
        profileData = JSON.parse(cached);
        // Clean up previously incorrectly cached isFollowing
        delete profileData.isFollowing;
    } else {
        const user = await User.findById(targetUserId).select('-passwordHash');
        if (!user) throw new ApiError(404, 'User not found');
        profileData = user.toJSON();
        if (redis) await redis.setEx(cacheKey, USER_CACHE_TTL, JSON.stringify(profileData));
    }

    let isFollowing = false;
    if (requestingUserId) {
        const relation = await Follower.findOne({ follower: requestingUserId, following: targetUserId });
        isFollowing = Boolean(relation);
    }

    const isOwnProfile = requestingUserId && requestingUserId.toString() === targetUserId.toString();
    const visibleProfile = isOwnProfile ? profileData : stripPrivateFields(profileData);

    // The header stays visible on a private account so it can be found and
    // followed; isLocked tells the client to render the request-to-follow state
    // instead of asking for posts it will be refused.
    const isLocked = Boolean(profileData.isPrivate) && !isOwnProfile && !isFollowing;

    return { ...visibleProfile, isFollowing, isLocked };
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

    if (updates.username) {
        updates.username = updates.username.toLowerCase().trim().replace(/\s+/g, '_');
        const existing = await User.findOne({ username: updates.username, _id: { $ne: userId } });
        if (existing) throw new ApiError(409, 'Username is already taken');
    }

    if (updates.email) {
        updates.email = updates.email.toLowerCase().trim();
        const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } });
        if (existing) throw new ApiError(409, 'Email is already associated with another account');
    }

    Object.assign(user, updates);
    await user.save();

    // Invalidate cache
    const redis = getRedisOptional();
    if (redis) await redis.del(`user:${userId}`);

    return user.toJSON();
};

const follow = async (followerId, followingId) => {
    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, 'You cannot follow yourself');
    }

    const target = await User.findById(followingId);
    if (!target) throw new ApiError(404, 'User not found');

    const existing = await Follower.findOne({ follower: followerId, following: followingId });
    if (existing) return { success: true, message: 'Already following' };

    await Follower.create({ follower: followerId, following: followingId });

    // Increment counters atomically
    await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);

    // Invalidate cached profiles
    const redis = getRedisOptional();
    if (redis) await redis.del([`user:${followerId}`, `user:${followingId}`]);

    // Notify via Direct Notification Service (Reliable Real-Time)
    await notificationService.createNotification({
        recipient: followingId,
        sender: followerId,
        type: 'follow'
    });

    return { message: `Now following @${target.username}` };
};

const unfollow = async (followerId, followingId) => {
    const relation = await Follower.findOneAndDelete({ follower: followerId, following: followingId });
    if (!relation) return { success: true, message: 'Already unfollowed' };

    await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
    ]);

    const redis = getRedisOptional();
    if (redis) await redis.del([`user:${followerId}`, `user:${followingId}`]);

    // Sync with Notifications: Remove the follow alert
    await notificationService.removeNotification({
        recipient: followingId,
        sender: followerId,
        type: 'follow'
    });

    return { message: 'Unfollowed successfully' };
};

/**
 * Cursor-paginated follower/following lists.
 *
 * The controller used to compute `skip` as `cursor ? 0 : 0` and always pass 0,
 * so only the first page was ever reachable no matter what the client sent.
 * Paginates on Follower.createdAt, matching the sort.
 */
const _paginateRelations = async (filter, populatePath, { limit = 20, cursor = null }) => {
    const query = { ...filter };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const relations = await Follower.find(query)
        .populate(populatePath, 'username fullName avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = relations.length > limit;
    const results = hasMore ? relations.slice(0, limit) : relations;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
        data: results.map((r) => r[populatePath]).filter(Boolean),
        nextCursor,
        hasMore,
    };
};

const getFollowers = async (userId, viewerId, options) => {
    await assertCanViewContent(userId, viewerId);
    return _paginateRelations({ following: userId }, 'follower', options);
};

const getFollowing = async (userId, viewerId, options) => {
    await assertCanViewContent(userId, viewerId);
    return _paginateRelations({ follower: userId }, 'following', options);
};

const searchUsers = async (q, { limit = 20, skip = 0 }) => {
    if (!q || q.trim().length < 1) throw new ApiError(400, 'Query must be at least 1 character');
    return User.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } },
    )
        .select('username fullName avatarUrl isVerified followersCount')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip);
};

/**
 * Accounts the user does not already follow, most-followed first.
 * Used by the "Suggested for you" panel.
 */
const getSuggestions = async (userId, { limit = 5 }) => {
    const following = await Follower.find({ follower: userId }).select('following').lean();
    const exclude = following.map((f) => f.following);
    exclude.push(userId);

    return User.find({ _id: { $nin: exclude }, status: 'active' })
        .select('username fullName avatarUrl isVerified followersCount')
        .sort({ followersCount: -1, createdAt: -1 })
        .limit(limit);
};

module.exports = {
    canViewContent,
    assertCanViewContent,
    getProfile,
    updateProfile,
    follow,
    unfollow,
    getFollowers,
    getFollowing,
    searchUsers,
    getSuggestions,
};
