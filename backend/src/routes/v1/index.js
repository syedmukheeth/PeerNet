'use strict';

const router = require('express').Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const storyRoutes = require('./story.routes');
const reelRoutes = require('./reel.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/stories', storyRoutes);
router.use('/dscrolls', reelRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
