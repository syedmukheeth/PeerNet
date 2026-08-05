'use strict';

const Notification = require('./Notification');
const Post = require('../post/Post');
const Comment = require('../comment/Comment');
const User = require('../user/User');
const Follower = require('../user/Follower');
const { getRedisOptional } = require('../../config/redis');

/**
 * The "Absolute Truth" Formatter
 * Standardizes notifications, extracts thumbnails, and calculates precise navigation URLs.
 */
const formatNotification = (notif, hydratedEntity = null) => {
    // 1. Convert to plain object
    const obj = notif.toObject ? notif.toObject({ virtuals: true, getters: true }) : { ...notif };
    
    // 2. Resolve the target entity (use the passed hydrate or the existing populated one)
    const e = hydratedEntity || obj.entityId;
    
    let thumbnail = null;
    let targetUrl = '/';
    let targetId = null;
    const type = obj.type;

    if (e) {
        // High-fidelity extraction logic
        const getMedia = (target) => (target ? target.mediaUrl || null : null);

        if (obj.entityModel === 'Post') {
            if (!e) {
                thumbnail = null;
                targetId = obj.entityId?.toString();
                targetUrl = `/posts/${targetId}`;
            } else {
                thumbnail = getMedia(e);
                targetId = e._id?.toString() || e.toString();
                targetUrl = `/posts/${targetId}`;
            }
        } else if (obj.entityModel === 'Comment') {
            // Reach through: use the populated parent post
            const parent = (e && e.post && typeof e.post === 'object') ? e.post : null;
            if (parent) {
                thumbnail = getMedia(parent);
                targetId = parent._id?.toString();
            }
            
        // Build navigation URL: always go to the parent post and pass the commentId
        if (targetId) {
            const parentId = (e && e.parentComment) ? (e.parentComment._id || e.parentComment).toString() : null;
            targetUrl = `/posts/${targetId}?commentId=${obj.entityId}${parentId ? `&parentId=${parentId}` : ''}`;
        } else {
            // Fallback: use raw ObjectId stored in e.post if e exists but parent isn't hydrated
            const rawParentId = e ? e.post?.toString() : null;
            targetUrl = rawParentId ? `/posts/${rawParentId}?commentId=${obj.entityId}` : '/';
        }
        }
    }

    // Standardize sender
    const sender = obj.sender && typeof obj.sender === 'object' ? {
        _id: obj.sender._id?.toString() || obj.sender.toString(),
        username: obj.sender.username,
        avatarUrl: obj.sender.avatarUrl,
        isVerified: obj.sender.isVerified
    } : null;

    // 🚀 PRODUCTION TRACER: Log generated thumbnail
    // For comment/reply, surface the comment body for frontend preview
    let commentBody = null;
    if ((type === 'comment' || type === 'reply') && e) {
        commentBody = e.body || null;
    }

    return {
        ...obj,
        _id: obj._id.toString(),
        thumbnail,
        targetUrl,
        targetId: targetId || (e?._id?.toString() || e?.toString()),
        sender,
        // Attach entity details needed by frontend
        entityId: e ? {
            _id: e._id?.toString(),
            body: e.body || null,
            post: e.post?._id?.toString() || e.post?.toString() || null,
            parentComment: e.parentComment?._id?.toString() || e.parentComment?.toString() || null,
        } : obj.entityId,
        commentBody,
    };
};

const createNotification = async (data) => {
    try {
        // 1. DEDUPLICATION: Avoid spamming identical notifications within 5 seconds for likes (rapid testing)
        // Others can keep 60s window.
        const windowDuration = data.type === 'like' ? 5000 : 60000;
        const duplicateWindow = new Date(Date.now() - windowDuration);
        const existing = await Notification.findOne({
            recipient: data.recipient,
            sender: data.sender,
            type: data.type,
            entityId: data.entityId,
            createdAt: { $gt: duplicateWindow }
        }).sort({ createdAt: -1 });

        if (existing) {
            // Already sent recently, just ignore or bump the timestamp if desired.
            // For now, we return null to signal "no new broadcast needed".
            return null;
        }

        const notification = await Notification.create(data);

        // Manual Hydration for single creation
        let hydratedEntity = null;
        if (data.entityModel === 'Post') hydratedEntity = await Post.findById(data.entityId).lean();
        else if (data.entityModel === 'Comment') hydratedEntity = await Comment.findById(data.entityId)
            .populate({ path: 'post', strictPopulate: false })
            .lean();

        const sender = await User.findById(data.sender).select('username avatarUrl isVerified').lean();
        
        // Convert to plain object to ensure we can attach the populated sender safely for broadcasting
        const notificationObj = notification.toObject();
        notificationObj.sender = sender;

        const formatted = formatNotification(notificationObj, hydratedEntity);

        // Broadcast to Redis for real-time delivery
        const redis = getRedisOptional();
        if (redis) {
            await redis.publish('peernet:notifications', JSON.stringify({
                recipient: data.recipient.toString(),
                type: 'new_notification',
                notification: formatted
            }));
        }

        return formatted;
    } catch {
        return null;
    }
};

const removeNotification = async (filter) => {
    try {
        const notification = await Notification.findOne(filter);
        if (!notification) return;
        await Notification.deleteOne({ _id: notification._id });

        const redis = getRedisOptional();
        if (redis) {
            await redis.publish('peernet:notifications', JSON.stringify({
                recipient: notification.recipient.toString(),
                type: 'notification_removed',
                notificationId: notification._id.toString()
            }));
        }
    } catch {
        // no-op: notification removal should not break request flow
    }
};

/**
 * The "BULK HYDRATION" Engine (Refined)
 * Grouped FETCH + Manual STITCH to bypass Mongoose populate instability.
 */
const getNotifications = async (userId, { limit = 20, cursor = null }) => {
    const query = { recipient: userId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    // Stage 1: Raw fetch
    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('sender', 'username avatarUrl isVerified');

    const rawResults = notifications.slice(0, limit);
    const hasMore = notifications.length > limit;

    // Stage 2: Entity ID collection
    const grouped = { Post: [], Comment: [] };
    rawResults.forEach(n => {
        if (n.entityId && n.entityModel && grouped[n.entityModel]) {
            grouped[n.entityModel].push(n.entityId);
        }
    });

    // Stage 3: Bulk Manual Hydration
    // For comments, also eagerly load the parent post so thumbnail can be extracted
    const [posts, comments] = await Promise.all([
        Post.find({ _id: { $in: grouped.Post } }).lean(),
        Comment.find({ _id: { $in: grouped.Comment } })
            .populate({ path: 'post', select: 'mediaUrl mediaType author', strictPopulate: false })
            .lean()
    ]);

    // Helper to check if a field is an unpopulated ObjectId
    const isUnpopulated = (val) => val && (!val._id || typeof val.author === 'undefined');

    const commentPostIds = [];
    comments.forEach(c => {
        if (isUnpopulated(c.post)) commentPostIds.push(c.post.toString());
    });

    const extraPosts = commentPostIds.length > 0
        ? await Post.find({ _id: { $in: commentPostIds } }).select('mediaUrl mediaType author').lean()
        : [];

    const extraPostsMap = new Map(extraPosts.map(p => [p._id.toString(), p]));

    // Patch comments: replace bare ObjectId with the fetched document
    comments.forEach(c => {
        if (isUnpopulated(c.post)) {
            c.post = extraPostsMap.get(c.post.toString()) || c.post;
        }
    });

    // Lookup table
    const entitiesMap = new Map();
    posts.forEach(p => entitiesMap.set(p._id.toString(), p));
    comments.forEach(c => entitiesMap.set(c._id.toString(), c));

    // Stage 4: Formatted Stitching
    const formattedResults = rawResults.map(n => {
        const hydrated = entitiesMap.get(n.entityId?.toString());
        return formatNotification(n, hydrated);
    });

    // Stage 4.5: Attach Following Status to Senders
    const senderIds = [...new Set(formattedResults.map(n => n.sender?._id).filter(Boolean))];
    if (senderIds.length > 0) {
        const relations = await Follower.find({
            follower: userId,
            following: { $in: senderIds }
        }).select('following');
        const followingSet = new Set(relations.map(r => r.following.toString()));
        
        formattedResults.forEach(n => {
            if (n.sender) {
                n.sender.isFollowing = followingSet.has(n.sender._id.toString());
            }
        });
    }

    // Stage 5: Self-Healing Garbage Collector
    const validResults = [];
    const ghosts = [];

    formattedResults.forEach(n => {
        // GHOST DETECTION: A notification is a ghost only if its target entity (Post/Comment)
        // was once there (entityId exists) but is no longer in our database (hydrated entity missing).
        const hasEntity = n.entityId;
        const entityIdStr = (n.entityId && typeof n.entityId === 'object' && n.entityId._id) 
            ? n.entityId._id.toString() 
            : n.entityId?.toString();
        const entityFound = entityIdStr && entitiesMap.has(entityIdStr);
        
        const isGhost = hasEntity && !entityFound && (n.type === 'like' || n.type === 'comment' || n.type === 'reply');
        
        if (isGhost) {
            ghosts.push(n._id);
        } else {
            validResults.push(n);
        }
    });

    if (ghosts.length > 0) {
        // Fire-and-forget background cleanup
        Notification.deleteMany({ _id: { $in: ghosts } }).catch(() => {});
    }

    const nextCursor = hasMore ? rawResults[rawResults.length - 1].createdAt.toISOString() : null;
    return { data: validResults, nextCursor, hasMore };
};

const markAllRead = async (userId) => {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

    // Broadcast sync event so all client sessions refresh their unread counts
    const redis = getRedisOptional();
    if (redis) {
        await redis.publish('peernet:notifications', JSON.stringify({
            recipient: userId.toString(),
            type: 'NOTIFICATION_COUNT_SYNC'
        }));
    }
};

const getUnreadCount = async (userId) =>
    Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { createNotification, removeNotification, getNotifications, markAllRead, getUnreadCount };
