'use strict';

const router = require('express').Router();
const notificationController = require('./notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// GET /api/v1/notifications
router.get('/', authenticate, notificationController.getNotifications);

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// PATCH /api/v1/notifications/read
router.patch('/read', authenticate, notificationController.markAllRead);

module.exports = router;
