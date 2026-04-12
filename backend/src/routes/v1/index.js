'use strict';

const router = require('express').Router();
const authRoutes = require('../../modules/auth/auth.routes');
const userRoutes = require('../../modules/user/user.routes');
const postRoutes = require('../../modules/post/post.routes');
const commentRoutes = require('../../modules/comment/comment.routes');
const storyRoutes = require('../../modules/story/story.routes');
const dscrollRoutes = require('../../modules/dscroll/dscroll.routes');
const notificationRoutes = require('../../modules/notification/notification.routes');
const adminRoutes = require('../../modules/admin/admin.routes');
const chatRoutes = require('../../modules/chat/chat.routes');
const aiRoutes = require('../../modules/ai/ai.routes');
const { authenticate } = require('../../middleware/auth.middleware');

// 🚀 NUCLEAR BYPASS: Diagnostic and Heartbeat routes defined directly to ensure visibility
router.get('/ping', (_req, res) => res.json({ status: 'pong', version: 'v2.bypass', timestamp: new Date() }));

const feedbackRoutes = require('../../modules/feedback/feedback.routes');

// ... other routes ...
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/stories', storyRoutes);
router.use('/dscrolls', dscrollRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/conversations', chatRoutes);
router.use('/ai', aiRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;
