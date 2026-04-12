'use strict';

const router = require('express').Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAdmin } = require('../../middleware/admin.middleware');

const guard = [authenticate, requireAdmin];

// Users
router.get('/users', ...guard, adminController.getUsers);
router.delete('/users/:userId', ...guard, adminController.deleteUser);
router.patch('/users/:userId/verify', ...guard, adminController.verifyUser);

// Content
router.get('/posts', ...guard, adminController.getPosts);
router.delete('/posts/:postId', ...guard, adminController.deletePost);
router.delete('/stories/:storyId', ...guard, adminController.deleteStory);

// Analytics
router.get('/stats', ...guard, adminController.getStats);

module.exports = router;
