'use strict';

const router = require('express').Router();
const aiController = require('./ai.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');
const { aiLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validate.middleware');
const { optimizeCaptionSchema } = require('../../validators/ai.validator');

router.use(authenticate);
// Both routes reach a paid API, so neither may be unmetered.
router.use(aiLimiter);

/**
 * @route   POST /api/v1/ai/generate-caption
 * @desc    Generate an AI caption for an image/video
 * @access  Private
 */
router.post('/generate-caption', uploadMedia.single('media'), aiController.generateCaption);
router.post('/optimize-caption', validate(optimizeCaptionSchema), aiController.optimizeCaption);

module.exports = router;
