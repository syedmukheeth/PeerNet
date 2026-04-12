'use strict';

const Notification = require('./Notification');
const Post = require('../post/Post');
const Comment = require('../comment/Comment');
const Dscroll = require('../dscroll/Dscroll');
const User = require('../user/User');
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
        const getMedia = (target) => {
            if (!target) return null;
            // Support for Post media, Dscroll thumbnailUrl, or raw videoUrl
            return target.mediaUrl || target.thumbnailUrl || (target.mediaType === 'video' ? target.videoUrl : null);
        };
        
        if (obj.entityModel === 'Post') {
            thumbnail = getMedia(e);
            targetId = e._id?.toString() || e.toString();
            targetUrl = `/posts/${targetId}`;
        } else if (obj.entityModel === 'Dscroll') {
            // For reels, prioritize the thumbnail
            thumbnail = e.thumbnailUrl || e.videoUrl || null;
            targetId = e._id?.toString() || e.toString();
            targetUrl = `/dscrolls`; 
        } else if (obj.entityModel === 'Comment') {
            // REACH THROUGH logic for comments: look for Post OR Dscroll links
            const parent = e.post || e.dscroll;
            if (parent && typeof parent === 'object') {
                thumbnail = getMedia(parent);
                targetId = parent._id?.toString() || parent.toString();
            }
            
            // Link to detail if resolved
            if (targetId) targetUrl = `/posts/${targetId}`;
            else targetUrl = `/posts/${e.post || e.dscroll || ''}`;
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
    if (process.env.NODE_ENV !== 'test') {
        console.log(`[NOTIF-THUMB] ID: ${obj._id} - Type: ${obj.type} - Thumb: ${thumbnail || 'NONE'}`);
    }

    return {
        ...obj,
        _id: obj._id.toString(),
        thumbnail,
        targetUrl,
        targetId: targetId || (e?._id?.toString() || e?.toString()),
        sender
    };
};

const createNotification = async (data) => {
    try {
        const notification = await Notification.create(data);

        // Manual Hydration for single creation (Double-checking reliability)
        let hydrated = null;
        if (data.entityModel === 'Post') hydrated = await Post.findById(data.entityId).lean();
        else if (data.entityModel === 'Dscroll') hydrated = await Dscroll.findById(data.entityId).lean();
        else if (data.entityModel === 'Comment') hydrated = await Comment.findById(data.entityId).populate({ path: 'post', strictPopulate: false }).populate({ path: 'dscroll', strictPopulate: false }).lean();

        const sender = await User.findById(data.sender).select('username avatarUrl isVerified').lean();
        notification.sender = sender;

        const formatted = formatNotification(notification, hydrated);

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
    } catch (err) {
        console.error(`[NOTIF-SERVICE] Create FAILED: ${err.message}`);
        throw err;
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
    } catch (err) {
        console.error(`[NOTIF-SERVICE] Remove FAILED: ${err.message}`);
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
    const grouped = { Post: [], Comment: [], Dscroll: [] };
    rawResults.forEach(n => {
        if (n.entityId && grouped[n.entityModel]) {
            grouped[n.entityModel].push(n.entityId);
        }
    });

    // Stage 3: Bulk Manual Hydration
    const [posts, dscrolls, comments] = await Promise.all([
        Post.find({ _id: { $in: grouped.Post } }).lean(),
        Dscroll.find({ _id: { $in: grouped.Dscroll } }).lean(),
        Comment.find({ _id: { $in: grouped.Comment } }).populate({ path: 'post', strictPopulate: false }).populate({ path: 'dscroll', strictPopulate: false }).lean()
    ]);

    // Lookup table
    const entitiesMap = new Map();
    posts.forEach(p => entitiesMap.set(p._id.toString(), p));
    dscrolls.forEach(d => entitiesMap.set(d._id.toString(), d));
    comments.forEach(c => entitiesMap.set(c._id.toString(), c));

    // Stage 4: Formatted Stitching
    const formattedResults = rawResults.map(n => {
        const hydrated = entitiesMap.get(n.entityId?.toString());
        return formatNotification(n, hydrated);
    });

    const nextCursor = hasMore ? rawResults[rawResults.length - 1].createdAt.toISOString() : null;
    return { data: formattedResults, nextCursor, hasMore };
};

const markAllRead = async (userId) => {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId) =>
    Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { createNotification, getNotifications, markAllRead, getUnreadCount };
