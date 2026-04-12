'use strict';

const Notification = require('./Notification');
const Post = require('../post/Post');
const Comment = require('../comment/Comment');
const Dscroll = require('../dscroll/Dscroll');
const { getRedisOptional } = require('../../config/redis');

const formatNotification = (notif) => {
    // Standardize to a plain object without losing populated data
    const obj = notif.toObject ? notif.toObject({ virtuals: true, getters: true }) : notif;
    const e = obj.entityId;
    
    let thumbnail = null;
    let targetId = null;

    // ULTRA-DEFENSIVE MAPPING: 
    // We search the entire object tree for anything that looks like a media URL.
    if (e) {
        if (typeof e === 'object') {
            const getMedia = (target) => target.mediaUrl || target.thumbnailUrl || target.videoUrl || null;
            
            // 1. Try the entity itself (for Post/Dscroll)
            thumbnail = getMedia(e);
            
            // 2. Try nested post (for Comment/Reply)
            if (!thumbnail && e.post) {
                thumbnail = getMedia(e.post);
                targetId = e.post._id || e.post;
            } else {
                targetId = e._id || e;
            }
        } else {
            // If e is just a string ID, we store it as targetId but thumbnail stays null
            targetId = e;
        }
    }

    return {
        ...obj,
        thumbnail,
        targetId: targetId?.toString() || null,
        _id: obj._id.toString(),
        sender: obj.sender ? {
            _id: obj.sender._id?.toString() || obj.sender.toString(),
            username: obj.sender.username,
            avatarUrl: obj.sender.avatarUrl,
            isVerified: obj.sender.isVerified
        } : null
    };
};

const createNotification = async (data) => {
    try {
        const notification = await Notification.create(data);

        // Populate for real-time delivery (Deep Sync for comment thumbnails)
        await notification.populate([
            { path: 'sender', select: 'username avatarUrl isVerified' },
            { 
                path: 'entityId', 
                options: { strictPopulate: false },
                populate: { path: 'post', select: 'mediaUrl thumbnailUrl videoUrl', options: { strictPopulate: false } }
            }
        ]);

        const formatted = formatNotification(notification);

        // Broadcast to Redis for real-time delivery (to Chat Service)
        const redis = getRedisOptional();
        if (redis) {
            try {
                const payload = {
                    recipient: notification.recipient.toString(),
                    type: 'new_notification',
                    notification: formatted
                };

                await redis.publish('peernet:notifications', JSON.stringify(payload));
            } catch (redisErr) {
                console.error(`[NOTIF-REDIS] Publish FAILED: ${redisErr.message}`);
            }
        }

        return formatted;
    } catch (err) {
        console.error(`NotificationService: Create FAILED - ${err.message}`);
        throw err;
    }
};

const removeNotification = async (filter) => {
    try {
        const notification = await Notification.findOne(filter);
        if (!notification) return;

        await Notification.deleteOne({ _id: notification._id });

        // Broadcast removal to real-time clients
        const redis = getRedisOptional();
        if (redis) {
            await redis.publish('peernet:notifications', JSON.stringify({
                recipient: notification.recipient.toString(),
                type: 'notification_removed',
                notificationId: notification._id.toString()
            }));
        }
    } catch (err) {
        console.error(`NotificationService: Remove FAILED - ${err.message}`);
    }
};

const getNotifications = async (userId, { limit = 20, cursor = null }) => {
    const query = { recipient: userId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('sender', 'username avatarUrl isVerified')
        .populate({
            path: 'entityId',
            options: { strictPopulate: false },
            populate: { 
                path: 'post', 
                select: 'mediaUrl thumbnailUrl videoUrl',
                options: { strictPopulate: false }
            }
        });

    const results = notifications.slice(0, limit);
    const hasMore = notifications.length > limit;
    
    // 🚑 SELF-HEALING REPAIR PASS
    // If population failed (ID is still a string), attempt manual recovery for thumbnails
    for (let notif of results) {
        if (notif.entityId && typeof notif.entityId !== 'object') {
            try {
                let repairEntity = null;
                const modelName = notif.entityModel;
                if (modelName === 'Post') {
                    repairEntity = await Post.findById(notif.entityId).select('mediaUrl thumbnailUrl videoUrl body caption');
                } else if (modelName === 'Dscroll') {
                    repairEntity = await Dscroll.findById(notif.entityId).select('mediaUrl thumbnailUrl videoUrl body caption');
                } else if (modelName === 'Comment') {
                    repairEntity = await Comment.findById(notif.entityId).populate('post', 'mediaUrl thumbnailUrl videoUrl');
                }
                
                if (repairEntity) {
                    notif.entityId = repairEntity; // Manually assign the repaired entity
                    // console.log(`[REPAIR] Fixed thumbnail for notif: ${notif._id}`);
                }
            } catch (repairErr) {
                // Fail silently, formatter will handle the null thumbnail gracefully
            }
        }
    }

    // Normalize data for the frontend (predictable thumbnails)
    const formattedResults = results.map(n => formatNotification(n));
    
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: formattedResults, nextCursor, hasMore };
};

const markAllRead = async (userId) => {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId) =>
    Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { createNotification, getNotifications, markAllRead, getUnreadCount };
