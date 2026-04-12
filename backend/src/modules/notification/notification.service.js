'use strict';

const Notification = require('./Notification');
const { getRedisOptional } = require('../../config/redis');

const createNotification = async (data) => {
    try {
        const notification = await Notification.create(data);

        // Populate for real-time delivery
        await notification.populate([
            { path: 'sender', select: 'username avatarUrl isVerified' },
            { path: 'entityId', options: { strictPopulate: false } }
        ]);

        // Broadcast to Redis for real-time delivery (to Chat Service)
        const redis = getRedisOptional();
        if (redis) {
            try {
                // BIG TECH: Explicitly construct the broadcast payload to ensure 
                // it contains everything needed for the UI toast without extra DB hits.
                const payload = {
                    recipient: notification.recipient.toString(),
                    notification: {
                        ...notification.toObject(),
                        _id: notification._id.toString(),
                        sender: {
                            _id: notification.sender._id.toString(),
                            username: notification.sender.username,
                            avatarUrl: notification.sender.avatarUrl
                        }
                    }
                };

                await redis.publish('peernet:notifications', JSON.stringify(payload));
            } catch (redisErr) {
                console.error(`[NOTIF-REDIS] Publish FAILED: ${redisErr.message}`);
            }
        }

        return notification;
    } catch (err) {
        console.error(`NotificationService: Create FAILED - ${err.message}`);
        throw err;
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
            // Populate nested author if the entity is a Comment
            populate: { path: 'author', select: 'username avatarUrl', options: { strictPopulate: false } }
        })
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = notifications.length > limit;
    const results = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: results, nextCursor, hasMore };
};

const markAllRead = async (userId) => {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId) =>
    Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { createNotification, getNotifications, markAllRead, getUnreadCount };
