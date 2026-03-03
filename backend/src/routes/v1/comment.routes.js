'use strict';

const router = require('express').Router();
const commentController = require('../../controllers/comment.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// DELETE /api/v1/comments/:id
router.delete('/:id', authenticate, commentController.deleteComment);

// POST /api/v1/comments/:id/like
router.post('/:id/like', authenticate, commentController.likeComment);

// DELETE /api/v1/comments/:id/like
router.delete('/:id/like', authenticate, commentController.unlikeComment);

module.exports = router;
