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
router.patch('/users/:userId/status', ...guard, adminController.updateUserStatus);
router.post('/users/:userId/warn', ...guard, adminController.warnUser);

// Content
router.get('/posts', ...guard, adminController.getPosts);
router.delete('/posts/:postId', ...guard, adminController.deletePost);
router.delete('/stories/:storyId', ...guard, adminController.deleteStory);
router.delete('/comments/:commentId', ...guard, adminController.deleteComment);

// Analytics & Issues
router.get('/stats', ...guard, adminController.getStats);
router.get('/feedback', ...guard, adminController.getFeedback);
router.get('/reports', ...guard, adminController.getReports);
router.patch('/reports/:reportId', ...guard, adminController.resolveReport);

// Infrastructure Control
router.delete('/infrastructure/nuke', ...guard, adminController.nukeInfrastructure);

module.exports = router;
