'use strict';

const router = require('express').Router();
const reelController = require('../../controllers/reel.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadVideo } = require('../../middleware/upload.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');

// GET /api/v1/reels
router.get('/', authenticate, reelController.getReelsFeed);

// POST /api/v1/reels
router.post('/', authenticate, uploadLimiter, uploadVideo.single('video'), reelController.createReel);

// DELETE /api/v1/reels/:id
router.delete('/:id', authenticate, reelController.deleteReel);

// POST /api/v1/reels/:id/like
router.post('/:id/like', authenticate, reelController.likeReel);

// DELETE /api/v1/reels/:id/like
router.delete('/:id/like', authenticate, reelController.unlikeReel);

module.exports = router;
