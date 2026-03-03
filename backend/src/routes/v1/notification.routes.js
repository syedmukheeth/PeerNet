'use strict';

const router = require('express').Router();
const notificationController = require('../../controllers/notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// GET /api/v1/notifications
router.get('/', authenticate, notificationController.getNotifications);

// PATCH /api/v1/notifications/read
router.patch('/read', authenticate, notificationController.markAllRead);

module.exports = router;
