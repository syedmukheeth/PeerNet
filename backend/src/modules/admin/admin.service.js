'use strict';

const mongoose = require('mongoose');
const User = require('../user/User');
const Post = require('../post/Post');
const Story = require('../story/Story');
const Feedback = require('../feedback/Feedback');
const Comment = require('../comment/Comment');
const Notification = require('../notification/Notification');
const Conversation = require('../chat/Conversation');
const Message = require('../chat/Message');
const AdminLog = require('./AdminLog');
const Report = require('./Report');
const { purgeUser } = require('../user/userPurge.service');
const postService = require('../post/post.service');
const commentService = require('../comment/comment.service');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { register } = require('../../config/metrics');

/**
 * Escapes regex metacharacters in an admin search term.
 *
 * These terms went into $regex verbatim. A search for "(" was a 500, and a
 * search for something like "(a+)+$" is a catastrophic-backtracking ReDoS that
 * pins the event loop for the whole process.
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUsers = async ({ limit = 20, skip = 0, search = '', role = '', status = '' }) => {
    let query = {};
    if (search) {
        const safe = escapeRegex(search);
        query.$or = [
            { username: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
            { fullName: { $regex: safe, $options: 'i' } }
        ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const [users, total] = await Promise.all([
        User.find(query).select('-passwordHash').lean().sort({ createdAt: -1 }).limit(limit).skip(skip),
        User.countDocuments(query),
    ]);
    return { users, total };
};

const getPosts = async ({ limit = 20, skip = 0, type = 'all', status = '', search = '' }) => {
    const postQuery = {};
    if (type === 'video') postQuery.mediaType = 'video';
    else if (type === 'image') postQuery.mediaType = 'image';
    else if (type === 'text') postQuery.mediaType = 'text';

    if (status === 'hidden') postQuery.isHidden = true;
    else if (status === 'active') postQuery.isHidden = { $ne: true };

    if (search) {
        // .filter(Boolean) never removed the id clause: the object literal is
        // always truthy, so { _id: undefined } stayed in the $or.
        postQuery.$or = [{ caption: { $regex: escapeRegex(search), $options: 'i' } }];
        if (mongoose.isValidObjectId(search)) postQuery.$or.push({ _id: search });
    }
    
    const [posts, total] = await Promise.all([
        Post.find(postQuery).populate('author', 'username avatarUrl').sort({ createdAt: -1 }).limit(limit).skip(skip),
        Post.countDocuments(postQuery),
    ]);
    return { posts, total };
};

const getComments = async ({ limit = 20, skip = 0, search = '' }) => {
    let query = {};
    if (search) {
        query.body = { $regex: escapeRegex(search), $options: 'i' };
    }
    
    const [comments, total] = await Promise.all([
        Comment.find(query)
            .populate('author', 'username avatarUrl')
            .populate('post', 'caption')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip),
        Comment.countDocuments(query),
    ]);
    return { comments, total };
};

const getFeedback = async ({ limit = 20, skip = 0 }) => {
    const [items, total] = await Promise.all([
        Feedback.find().populate('userId', 'username email').sort({ createdAt: -1 }).limit(limit).skip(skip),
        Feedback.countDocuments(),
    ]);
    return { items, total };
};

const deleteUser = async (adminId, userId, reason = '') => {
    // This used to be a bare findByIdAndDelete plus an avatar cleanup, which
    // orphaned every post, comment, like, follow and message the user owned.
    // purgeUser cascades and fixes the denormalised counters on the users they
    // followed.
    const result = await purgeUser(userId);
    if (result.skipped) throw new ApiError(404, 'User not found');

    await AdminLog.create({
        adminId,
        action: 'DELETE_USER',
        targetType: 'User',
        targetId: userId,
        details:
            `Deleted user @${result.username}. Reason: ${reason}. ` +
            `Cascaded: ${result.posts} posts, ${result.comments} comments, ` +
            `${result.likes} likes, ${result.follows} follows, ${result.messages} messages`,
    });
};

const updateUserStatus = async (adminId, userId, status, reason = '') => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    const oldStatus = user.status;
    user.status = status;
    await user.save();

    await AdminLog.create({
        adminId,
        action: 'UPDATE_USER_STATUS',
        targetType: 'User',
        targetId: userId,
        details: `Updated @${user.username} from ${oldStatus} to ${status}. Reason: ${reason}`
    });
    return user;
};

const resetUserPassword = async (adminId, userId, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    await AdminLog.create({
        adminId,
        action: 'RESET_PASSWORD',
        targetType: 'User',
        targetId: userId,
        details: `Force password reset for @${user.username}`
    });
};

const deletePost = async (adminId, postId, reason = '') => {
    // Author is populated before the delete: reading `post.author?.username` off
    // the result of findByIdAndDelete gave an unpopulated ObjectId, so every
    // audit entry recorded "unknown". Deletion goes through the post service's
    // cascade so moderator deletion removes as much as an author's own does
    // (likes, comments, saves, notifications, postsCount) instead of leaving
    // orphans behind.
    const post = await Post.findById(postId).populate('author', 'username');
    if (!post) throw new ApiError(404, 'Post not found');

    const authorName = post.author?.username || 'unknown';
    const authorId = post.author?._id || post.author;

    await postService.cascadeDeletePost({
        _id: post._id,
        author: authorId,
        mediaPublicId: post.mediaPublicId,
        mediaType: post.mediaType,
    });

    await AdminLog.create({
        adminId,
        action: 'DELETE_POST',
        targetType: 'Post',
        targetId: postId,
        details: `Deleted post by @${authorName}. Reason: ${reason}`
    });
};

const updatePostVisibility = async (adminId, postId, isHidden, reason = '') => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    
    post.isHidden = isHidden;
    await post.save();

    await AdminLog.create({
        adminId,
        action: isHidden ? 'HIDE_POST' : 'RESTORE_POST',
        targetType: 'Post',
        targetId: postId,
        details: `${isHidden ? 'Hid' : 'Restored'} post. Reason: ${reason}`
    });
};

const deleteComment = async (adminId, commentId, reason = '') => {
    // Same two fixes as deletePost: populate before deleting so the log records
    // a real username, and cascade so replies, likes and commentsCount stay
    // consistent.
    const comment = await Comment.findById(commentId).populate('author', 'username');
    if (!comment) throw new ApiError(404, 'Comment not found');

    const authorName = comment.author?.username || 'unknown';
    const authorId = comment.author?._id || comment.author;

    await commentService.cascadeDeleteComment(
        { _id: comment._id, post: comment.post, author: authorId },
        adminId,
    );

    await AdminLog.create({
        adminId,
        action: 'DELETE_COMMENT',
        targetType: 'Comment',
        targetId: commentId,
        details: `Deleted comment by @${authorName}. Reason: ${reason}`
    });
};

const warnUser = async (adminId, userId, message) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    await Notification.create({
        recipient: userId,
        sender: adminId,
        type: 'system_warning',
        message
    });

    await AdminLog.create({
        adminId,
        action: 'WARN_USER',
        targetType: 'User',
        targetId: userId,
        details: `Issued system warning to @${user.username}. Message: ${message}`
    });
};

const deleteStory = async (storyId) => {
    const story = await Story.findByIdAndDelete(storyId);
    if (!story) throw new ApiError(404, 'Story not found');
    if (story.mediaPublicId) await deleteFromCloudinary(story.mediaPublicId);
};

const getPlatformStats = async () => {
    const [userCount, postCount, videoCount, storyCount, feedbackCount] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments(),
        Post.countDocuments({ mediaType: 'video' }),
        Story.countDocuments(),
        Feedback.countDocuments({ status: 'open' })
    ]);

    // Video posts carry far more bandwidth than image posts, so they are weighted apart.
    const calculatedBandwidth = (userCount * 0.15) + ((postCount - videoCount) * 1.2) + (videoCount * 8.5) + (storyCount * 3.2);
    const bandwidthUsage = calculatedBandwidth > 1024 
        ? (calculatedBandwidth / 1024).toFixed(2) + ' TB' 
        : calculatedBandwidth.toFixed(2) + ' GB';

    // Get real process metrics from prom-client
    const metrics = await register.getMetricsAsJSON();
    const memMetric = metrics.find(m => m.name === 'nodejs_heap_size_total_bytes');
    const cpuMetric = metrics.find(m => m.name === 'process_cpu_user_seconds_total');
    
    const heapUsed = memMetric?.values[0]?.value || 0;
    const cpuUsed = cpuMetric?.values[0]?.value || 0;
        
    return { 
        userCount,
        postCount,
        storyCount,
        videoCount,
        openFeedback: feedbackCount,
        bandwidthUsage,
        system: {
            heapUsed: (heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            cpuSeconds: cpuUsed.toFixed(2),
            uptime: process.uptime().toFixed(0)
        }
    };
};

const toggleUserVerification = async (adminId, userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    user.isVerified = !user.isVerified;
    await user.save();

    await AdminLog.create({
        adminId,
        action: user.isVerified ? 'VERIFY_USER' : 'UNVERIFY_USER',
        targetType: 'User',
        targetId: userId,
        details: `${user.isVerified ? 'Verified' : 'Unverified'} @${user.username}`
    });
    return user;
};

const getReports = async ({ limit = 20, skip = 0, status = 'pending' }) => {
    const query = status ? { status } : {};
    const [reports, total] = await Promise.all([
        Report.find(query)
            .populate('reporter', 'username avatarUrl')
            .populate('targetId')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip),
        Report.countDocuments(query)
    ]);
    return { reports, total };
};

const resolveReport = async (adminId, reportId, status, resolution = '') => {
    const report = await Report.findById(reportId);
    if (!report) throw new ApiError(404, 'Report not found');
    
    report.status = status;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    await report.save();

    await AdminLog.create({
        adminId,
        action: 'RESOLVE_REPORT',
        targetType: 'Report',
        targetId: reportId,
        details: `Resolved report as ${status}. Resolution: ${resolution}`
    });
};

const getAuditLogs = async ({ limit = 50, skip = 0, search = '' }) => {
    const query = search ? { details: { $regex: escapeRegex(search), $options: 'i' } } : {};
    const [logs, total] = await Promise.all([
        AdminLog.find(query).populate('adminId', 'username avatarUrl').sort({ createdAt: -1 }).limit(limit).skip(skip),
        AdminLog.countDocuments(query)
    ]);
    return { logs, total };
};

const getAdvancedStats = async () => {
    const now = new Date();
    const midNight = new Date(now.setHours(0, 0, 0, 0));
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
        userCount, 
        postCount, 
        storyCount, 
        commentCount,
        bannedCount, 
        pendingReports,
        activeToday,
        signupsToday,
        commentsToday
    ] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments(),
        Story.countDocuments(),
        Comment.countDocuments(),
        User.countDocuments({ status: 'banned' }),
        Report.countDocuments({ status: 'pending' }),
        User.countDocuments({ lastLogin: { $gte: twentyFourHoursAgo } }),
        User.countDocuments({ createdAt: { $gte: midNight } }),
        Comment.countDocuments({ createdAt: { $gte: midNight } })
    ]);

    // Daily Growth Aggregation (Padded to 30 days)
    const getGrowthData = async (Model) => {
        const growth = await Model.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Pad with zeros for days with no activity
        const padded = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Array(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0])[0];
            const found = growth.find(g => g._id === date);
            padded.push({ date, count: found ? found.count : 0 });
        }
        return padded;
    };

    const [userGrowth, postGrowth] = await Promise.all([
        getGrowthData(User),
        getGrowthData(Post)
    ]);

    // Infrastructure Calculation (Footprint High-Fidelity)
    const MAX_STORAGE_MB = 10240; // 10GB Initial Provisioning
    const estimatedPostBytes = postCount * 2.1 * 1024 * 1024;
    const estimatedStoryBytes = storyCount * 1.5 * 1024 * 1024;
    const estimatedMetadataBytes = (userCount + commentCount) * 0.05 * 1024 * 1024;
    
    const storageUsedMB = Math.round((estimatedPostBytes + estimatedStoryBytes + estimatedMetadataBytes) / (1024 * 1024));
    const storagePercentage = Math.min(100, Math.round((storageUsedMB / MAX_STORAGE_MB) * 100));

    // Synchronicity Logic: Success rate of last 50 administrative operations
    const recentLogs = await AdminLog.find().sort({ createdAt: -1 }).limit(50).lean();
    const failurePatterns = ['error', 'fail', 'unauthorized'];
    // details is optional on AdminLog, so any entry written without one used to
    // throw here and take the whole analytics endpoint down.
    const failures = recentLogs.filter(log =>
        failurePatterns.some(p => (log.details || '').toLowerCase().includes(p))
    ).length;
    const healthSynchronicity = recentLogs.length > 0 
        ? Math.max(92, 100 - (failures / recentLogs.length) * 100).toFixed(1) 
        : "100.0";

    return {
        totalUsers: userCount,
        totalPosts: postCount,
        totalStories: storyCount,
        totalComments: commentCount,
        bannedUsers: bannedCount,
        pendingReports,
        activeToday,
        signupsToday,
        commentsToday,
        storage: {
            usedMB: storageUsedMB,
            maxMB: MAX_STORAGE_MB,
            percentage: storagePercentage
        },
        health: {
            synchronicity: healthSynchronicity,
            status: failures > 5 ? 'Degraded' : 'Healthy'
        },
        charts: {
            userGrowth,
            postGrowth
        }
    };
};

/**
 * PURGE LOGIC (SENIOR IMPLEMENTATION)
 * These operations are destructive and should be handled with extreme care.
 */

const nukeUsers = async (requestingAdminId) => {
    logger.warn(`NUKE: User purge initiated by ${requestingAdminId}`);

    // Preserve the requesting admin and every other privileged account to
    // prevent total system lockout. The role filter used to be
    // `{ $ne: 'admin' }`, which deleted superadmins along with everyone else.
    const targets = await User.find({
        _id: { $ne: requestingAdminId },
        role: { $nin: ['admin', 'superadmin'] },
    }).select('_id').lean();

    // purgeUser rather than deleteMany: a bare delete left every post, comment,
    // like, follow, story and saved post owned by these accounts behind, and
    // left the surviving admins' followersCount permanently inflated.
    let purgedCount = 0;
    for (const target of targets) {
        try {
            await purgeUser(target._id);
            purgedCount += 1;
        } catch (err) {
            logger.error(`NUKE: Failed to purge ${target._id}: ${err.message}`);
        }
    }

    // Anything the per-user cascade cannot own, because it spans users.
    await Promise.all([
        Notification.deleteMany({}),
        Conversation.deleteMany({}),
        Message.deleteMany({}),
    ]);

    return { purgedCount };
};

const nukeContent = async () => {
    logger.warn('NUKE: Content purge initiated');
    
    const [posts, stories, comments] = await Promise.all([
        Post.deleteMany({}),
        Story.deleteMany({}),
        Comment.deleteMany({})
    ]);

    return {
        posts: posts.deletedCount,
        stories: stories.deletedCount,
        comments: comments.deletedCount
    };
};

const nukeInfrastructure = async (adminId, type) => {
    if (type === 'users') return await nukeUsers(adminId);
    if (type === 'content') return await nukeContent();
    
    if (type === 'full') {
        const users = await nukeUsers(adminId);
        const content = await nukeContent();
        return { users, content, status: 'GENESIS_RESET_COMPLETE' };
    }
    
    throw new ApiError(400, 'Invalid nuke type');
};

module.exports = { 
    getUsers, 
    getPosts,
    getFeedback,
    getReports,
    getAuditLogs,
    getComments,
    deleteUser, 
    updateUserStatus,
    resetUserPassword,
    deletePost, 
    updatePostVisibility,
    deleteStory,
    getPlatformStats, 
    getAdvancedStats,
    toggleUserVerification,
    resolveReport,
    deleteComment,
    warnUser,
    nukeInfrastructure
};
