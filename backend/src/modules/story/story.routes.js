'use strict';

const router = require('express').Router();
const storyController = require('./story.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');

// GET /api/v1/stories
router.get('/', authenticate, storyController.getStories);

// POST /api/v1/stories
router.post(
    '/',
    authenticate,
    uploadLimiter,
    uploadMedia.single('media'),
    storyController.createStory,
);

// DELETE /api/v1/stories/:id
router.delete('/:id', authenticate, storyController.deleteStory);

// POST /api/v1/stories/:id/view
router.post('/:id/view', authenticate, storyController.viewStory);

module.exports = router;
