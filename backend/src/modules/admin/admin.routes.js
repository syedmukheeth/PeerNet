'use strict';

const router = require('express').Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/admin.middleware');

const guard = [authenticate, requireAdmin];
const superGuard = [authenticate, requireSuperAdmin];

// Users
router.get('/users', ...guard, adminController.getUsers);
router.delete('/users/:userId', ...guard, adminController.deleteUser);
router.patch('/users/:userId/verify', ...guard, adminController.verifyUser);
router.patch('/users/:userId/status', ...guard, adminController.updateUserStatus);
router.post('/users/:userId/warn', ...guard, adminController.warnUser);
// Superadmin only: setting another user's password is account takeover, which
// is a different power from the moderation actions above.
router.post('/users/:userId/reset-password', ...superGuard, adminController.resetUserPassword);

// Content
router.get('/posts', ...guard, adminController.getPosts);
router.get('/comments', ...guard, adminController.getComments);
router.delete('/posts/:postId', ...guard, adminController.deletePost);
router.patch('/posts/:postId/visibility', ...guard, adminController.updatePostVisibility);
router.delete('/stories/:storyId', ...guard, adminController.deleteStory);
router.delete('/comments/:commentId', ...guard, adminController.deleteComment);

// Analytics & Issues
router.get('/stats', ...guard, adminController.getStats);
router.get('/logs', ...guard, adminController.getAuditLogs);
router.get('/feedback', ...guard, adminController.getFeedback);
router.get('/reports', ...guard, adminController.getReports);
router.get('/analytics', ...guard, adminController.getAnalytics);
router.patch('/reports/:reportId', ...guard, adminController.resolveReport);

// Infrastructure Control
// Deletes every user and all of their content. Superadmin only: a plain admin
// account must not be one request away from emptying the database.
router.delete('/infrastructure/nuke', ...superGuard, adminController.nukeInfrastructure);

module.exports = router;
