'use strict';

const router = require('express').Router();
const postController = require('../../controllers/post.controller');
const commentController = require('../../controllers/comment.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');
const { createPostSchema, updatePostSchema } = require('../../validators/post.validator');
const { addCommentSchema } = require('../../validators/comment.validator');

// GET /api/v1/posts/feed
router.get('/feed', authenticate, postController.getFeed);

// GET /api/v1/posts/saved
router.get('/saved', authenticate, postController.getSavedPosts);

// POST /api/v1/posts
router.post(
    '/',
    authenticate,
    uploadLimiter,
    uploadMedia.single('media'),
    validate(createPostSchema),
    postController.createPost,
);

// GET /api/v1/posts/:id
router.get('/:id', authenticate, postController.getPost);

// PATCH /api/v1/posts/:id
router.patch('/:id', authenticate, validate(updatePostSchema), postController.updatePost);

// DELETE /api/v1/posts/:id
router.delete('/:id', authenticate, postController.deletePost);

// POST /api/v1/posts/:id/like
router.post('/:id/like', authenticate, postController.likePost);

// DELETE /api/v1/posts/:id/like
router.delete('/:id/like', authenticate, postController.unlikePost);

// POST /api/v1/posts/:id/save
router.post('/:id/save', authenticate, postController.savePost);

// DELETE /api/v1/posts/:id/save
router.delete('/:id/save', authenticate, postController.unsavePost);

// GET/POST /api/v1/posts/:postId/comments
router.get('/:postId/comments', authenticate, commentController.getComments);
router.post('/:postId/comments', authenticate, validate(addCommentSchema), commentController.addComment);

// GET /api/v1/posts/:postId/comments/:commentId/replies
router.get('/:postId/comments/:commentId/replies', authenticate, commentController.getReplies);

module.exports = router;
