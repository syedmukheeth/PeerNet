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
const notificationService = require('../../modules/notification/notification.service');
const { authenticate } = require('../../middleware/auth.middleware');

// 🚀 NUCLEAR BYPASS: Diagnostic and Heartbeat routes defined directly to ensure visibility
router.get('/ping', (_req, res) => res.json({ status: 'pong', version: 'v2.bypass', timestamp: new Date() }));

router.get('/notifications/unread-count', authenticate, async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user._id);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/stories', storyRoutes);
router.use('/dscrolls', dscrollRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/chats', chatRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
