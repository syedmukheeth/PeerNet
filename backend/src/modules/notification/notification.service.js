'use strict';

const Notification = require('./Notification');
const { getRedisOptional } = require('../../config/redis');

const formatNotification = (notif) => {
    const obj = notif.toObject ? notif.toObject() : notif;
    const e = obj.entityId;
    
    // Normalization logic: Extract thumbnail and target link from any entity type
    let thumbnail = null;
    let targetId = null;

    if (e && typeof e === 'object') {
        const isComment = obj.entityModel === 'Comment' || obj.entityModel === 'Reply';
        const targetEntity = isComment && e.post ? e.post : e;
        
        thumbnail = targetEntity.mediaUrl || targetEntity.thumbnailUrl || targetEntity.videoUrl;
        targetId = (isComment && e.post) ? e.post._id : e._id;
    }

    return {
        ...obj,
        thumbnail,
        targetId,
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
        .populate('sender', 'username avatarUrl isVerified')
        .populate({
            path: 'entityId',
            options: { strictPopulate: false },
            // Populate nested author and necessary fields for preview (body for comments, caption for posts)
            populate: [
                { path: 'author', select: 'username avatarUrl', options: { strictPopulate: false } },
                { path: 'post', select: 'mediaUrl thumbnailUrl videoUrl', options: { strictPopulate: false } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = notifications.length > limit;
    const results = hasMore ? notifications.slice(0, limit) : notifications;
    
    // Normalize data for the frontend
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
