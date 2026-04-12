'use strict';

const router = require('express').Router();
const aiController = require('./ai.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');

router.use(authenticate);

/**
 * @route   POST /api/v1/ai/generate-caption
 * @desc    Generate an AI caption for an image/video
 * @access  Private
 */
router.post('/generate-caption', uploadMedia.single('media'), aiController.generateCaption);
router.post('/optimize-caption', aiController.optimizeCaption);

module.exports = router;
