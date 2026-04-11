'use strict';

const router = require('express').Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadImage } = require('../../middleware/upload.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { updateProfileSchema } = require('../../validators/user.validator');

// GET /api/v1/users/me
router.get('/me', authenticate, userController.getMe);

// GET /api/v1/users/search?q=
router.get('/search', authenticate, userController.searchUsers);

// GET /api/v1/users/:id
router.get('/:id', authenticate, userController.getProfile);

// GET /api/v1/users/:id/posts
router.get('/:id/posts', authenticate, userController.getUserPosts);

// GET /api/v1/users/:id/followers
router.get('/:id/followers', authenticate, userController.getFollowers);

// GET /api/v1/users/:id/following
router.get('/:id/following', authenticate, userController.getFollowing);

// PATCH /api/v1/users/me
router.patch('/me', authenticate, uploadImage.single('avatar'), validate(updateProfileSchema), userController.updateProfile);

// POST /api/v1/users/:id/follow
router.post('/:id/follow', authenticate, userController.follow);

// DELETE /api/v1/users/:id/follow
router.delete('/:id/follow', authenticate, userController.unfollow);

module.exports = router;
