'use strict';

const router = require('express').Router();
const authRoutes = require('../../modules/auth/auth.routes');
const userRoutes = require('../../modules/user/user.routes');
const postRoutes = require('../../modules/post/post.routes');
const commentRoutes = require('../../modules/comment/comment.routes');
const storyRoutes = require('../../modules/story/story.routes');
const dscrollRoutes = require('../../modules/dscroll/dscroll.routes');
const notificationRoutes = require('../../modules/notification/notification.service').routes || require('../../modules/notification/notification.routes');
const adminRoutes = require('../../modules/admin/admin.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/stories', storyRoutes);
router.use('/dscrolls', dscrollRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
