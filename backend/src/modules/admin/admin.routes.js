'use strict';

const router = require('express').Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAdmin } = require('../../middleware/admin.middleware');

const guard = [authenticate, requireAdmin];

// GET /api/v1/admin/users
router.get('/users', ...guard, adminController.getUsers);

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', ...guard, adminController.deleteUser);

// DELETE /api/v1/admin/posts/:id
router.delete('/posts/:id', ...guard, adminController.deletePost);

// PATCH /api/v1/admin/users/:id/verify
router.patch('/users/:id/verify', ...guard, adminController.toggleVerification);

// GET /api/v1/admin/stats
router.get('/stats', ...guard, adminController.getStats);

module.exports = router;
