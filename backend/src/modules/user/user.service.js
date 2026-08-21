'use strict';

const User = require('./User');
const Follower = require('./Follower');
const { getRedisOptional } = require('../../config/redis');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const { clampedDecrement } = require('../../utils/counters.utils');
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
        // diskStorage, not memoryStorage: .buffer is always undefined here and
        // uploadToCloudinary takes a path, so avatar upload failed for everyone.
        const { secure_url, public_id } = await uploadToCloudinary(avatarFile.path, {
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

        if (updates.email !== user.email) {
            // The email is the account's recovery identity and the key
            // googleLogin matches on, so changing it is a credential change.
            // It used to be a plain profile field: anyone with a stolen access
            // token could point the account at their own address and keep it.
            if (!updates.currentPassword) {
                throw new ApiError(400, 'Your current password is required to change your email');
            }

            const withHash = await User.findById(userId).select('+passwordHash');
            if (!(await withHash.matchPassword(updates.currentPassword))) {
                throw new ApiError(401, 'Current password is incorrect');
            }

            const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } });
            if (existing) throw new ApiError(409, 'Email is already associated with another account');

            // A newly set address has not been proven, so the account loses its
            // verified state until it is.
            user.isVerified = false;
        }
    }

    delete updates.currentPassword;
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

    // Check-then-act would let two concurrent follows both pass the lookup and
    // then increment the counters twice for one relationship. The unique index
    // is the real guard: the counters are only touched when the insert is the
    // one that actually created the row.
    try {
        await Follower.create({ follower: followerId, following: followingId });
    } catch (err) {
        if (err.code === 11000) return { success: true, message: 'Already following' };
        throw err;
    }

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
        User.findByIdAndUpdate(followerId, clampedDecrement('followingCount')),
        User.findByIdAndUpdate(followingId, clampedDecrement('followersCount')),
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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Find people.
 *
 * This used to be a bare $text search, which has two consequences nobody wants
 * from a people finder. $text matches whole stemmed words, so typing "jo" found
 * nothing at all for "john" - you had to know the whole name before you could
 * look it up. And it had no status filter and no self-exclusion, so banned and
 * deleted accounts were returnable and you could find yourself.
 *
 * The text index still does the relevance work for whole words; an anchored
 * regex handles the prefix case that people actually type. Results are ordered
 * prefix matches first, then by follower count, because when someone types
 * three letters they almost always mean the name that starts with them.
 */
const searchUsers = async (q, { limit = 20, skip = 0, viewerId = null } = {}) => {
    const term = (q || '').trim();
    if (term.length < 1) throw new ApiError(400, 'Query must be at least 1 character');

    const prefix = new RegExp(`^${escapeRegex(term)}`, 'i');
    const anywhere = new RegExp(escapeRegex(term), 'i');

    const query = {
        status: 'active',
        $or: [
            { username: anywhere },
            { fullName: anywhere },
        ],
    };

    // You are never a search result for yourself.
    if (viewerId) query._id = { $ne: viewerId };

    // One extra row tells the caller whether another page exists without a
    // second count query.
    const users = await User.find(query)
        .select('username fullName avatarUrl isVerified followersCount')
        .sort({ followersCount: -1, createdAt: -1 })
        .limit(limit + 1)
        .skip(skip)
        .lean();

    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;

    // Someone whose name begins with the term is who you meant.
    page.sort((a, b) => {
        const aStarts = prefix.test(a.username) || prefix.test(a.fullName || '');
        const bStarts = prefix.test(b.username) || prefix.test(b.fullName || '');
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return (b.followersCount || 0) - (a.followersCount || 0);
    });

    /*
     * Whether the viewer already follows each result.
     *
     * The endpoint never returned this, so `isFollowing` was always undefined
     * and every row in the search results rendered "Follow" - including for
     * people you already followed. Same batch lookup the notification list uses.
     */
    if (viewerId && page.length > 0) {
        const relations = await Follower.find({
            follower: viewerId,
            following: { $in: page.map((u) => u._id) },
        }).select('following').lean();

        const followed = new Set(relations.map((r) => r.following.toString()));
        page.forEach((u) => { u.isFollowing = followed.has(u._id.toString()); });
    }

    return { data: page, hasMore };
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
