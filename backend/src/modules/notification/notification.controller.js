'use strict';

const notificationService = require('./notification.service');
const { parsePagination } = require('../../utils/pagination.utils');

/**
 * Fetch notifications for the authenticated user
 */
const getNotifications = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const [result, unreadCount] = await Promise.all([
            notificationService.getNotifications(req.user._id, { limit, cursor }),
            notificationService.getUnreadCount(req.user._id),
        ]);
        res.json({ success: true, ...result, unreadCount });
    } catch (err) { 
        next(err); 
    }
};

/**
 * Mark all notifications as read for the authenticated user
 */
const markAllRead = async (req, res, next) => {
    try {
        await notificationService.markAllRead(req.user._id);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { 
        next(err); 
    }
};

/**
 * Get count of unread notifications
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationService.getUnreadCount(req.user._id);
        res.json({ success: true, count });
    } catch (err) { 
        next(err); 
    }
};

module.exports = { getNotifications, markAllRead, getUnreadCount };
