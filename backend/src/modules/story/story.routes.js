'use strict';

const router = require('express').Router();
const storyController = require('./story.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validate.middleware');
const { createStorySchema } = require('../../validators/story.validator');

// GET /api/v1/stories
router.get('/', authenticate, storyController.getStories);

// POST /api/v1/stories
router.post(
    '/',
    authenticate,
    uploadLimiter,
    // Multer first: the body is multipart, so req.body is not populated until
    // it has run. A rejection here leaves a temp file behind, which the
    // cleanupOrphanedUpload handler in app.js removes.
    uploadMedia.single('media'),
    validate(createStorySchema),
    storyController.createStory,
);

// DELETE /api/v1/stories/:id
router.delete('/:id', authenticate, storyController.deleteStory);

// POST /api/v1/stories/:id/view
router.post('/:id/view', authenticate, storyController.viewStory);

module.exports = router;
