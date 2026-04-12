'use strict';

const router = require('express').Router();
const messageRoutes = require('./message.routes');
const messageController = require('./../../controllers/message.controller');
const { authenticate } = require('./../../middleware/auth.middleware');

// 🚀 NUCLEAR BYPASS: Diagnostic and Heartbeat routes defined directly to ensure visibility
router.get('/ping', (_req, res) => res.json({ status: 'pong', version: 'v2.bypass', service: 'chat', timestamp: new Date() }));

router.get('/conversations/unread-count', authenticate, messageController.getUnreadCount);

router.use('/conversations', messageRoutes);

module.exports = router;
