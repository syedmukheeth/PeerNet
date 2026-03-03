'use strict';

const router = require('express').Router();
const adminController = require('../../controllers/admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAdmin } = require('../../middleware/admin.middleware');

const guard = [authenticate, requireAdmin];

// GET /api/v1/admin/users
router.get('/users', ...guard, adminController.getUsers);

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', ...guard, adminController.deleteUser);

// DELETE /api/v1/admin/posts/:id
router.delete('/posts/:id', ...guard, adminController.deletePost);

// GET /api/v1/admin/stats
router.get('/stats', ...guard, adminController.getStats);

module.exports = router;
