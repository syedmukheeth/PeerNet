'use strict';

const router = require('express').Router();
const shortsController = require('./shorts.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadVideo } = require('../../middleware/upload.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');

// GET /api/v1/shorts
router.get('/', authenticate, shortsController.getShortsFeed);

// POST /api/v1/shorts
router.post('/', authenticate, uploadLimiter, uploadVideo.single('video'), shortsController.createShort);

// DELETE /api/v1/shorts/:id
router.delete('/:id', authenticate, shortsController.deleteShort);

// POST /api/v1/shorts/:id/like
router.post('/:id/like', authenticate, shortsController.likeShort);

// DELETE /api/v1/shorts/:id/like
router.delete('/:id/like', authenticate, shortsController.unlikeShort);

module.exports = router;
