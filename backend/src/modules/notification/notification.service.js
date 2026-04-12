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
                // We emit a robust object that the Chat Service expects
                await redis.publish('peernet:notifications', JSON.stringify({
                    recipient: notification.recipient.toString(),
                    notification: notification.toJSON()
                }));
            } catch (redisErr) {
                console.error(`NotificationService: Redis publish FAILED - ${redisErr.message}`);
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
        // strictPopulate set to false allows population even if entityModel is missing on legacy documents
        .populate({ path: 'entityId', options: { strictPopulate: false } })
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
