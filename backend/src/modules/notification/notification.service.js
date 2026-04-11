'use strict';

const Notification = require('./Notification');
const { getRedisOptional } = require('../../config/redis');

const createNotification = async ({ recipient, sender, type, entityId, entityModel }) => {
    // Don't notify yourself
    if (recipient.toString() === sender.toString()) return;

    const notification = await Notification.create({ recipient, sender, type, entityId, entityModel });

    // Populate sender and entity details for real-time delivery
    await notification.populate([
        { path: 'sender', select: 'username avatarUrl isVerified' },
        { path: 'entityId', options: { strictPopulate: false } }
    ]);

    // Push real-time notification cross-service via Redis
    const redis = getRedisOptional();
    if (redis) {
        try {
            await redis.publish('peernet:notifications', JSON.stringify({
                recipient: recipient.toString(),
                notification
            }));
        } catch (err) {
            console.error('Failed to publish notification to Redis:', err);
        }
    }

    return notification;
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
