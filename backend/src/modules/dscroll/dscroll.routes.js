'use strict';

const router = require('express').Router();
const dscrollController = require('./dscroll.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadVideo } = require('../../middleware/upload.middleware');
const { uploadLimiter } = require('../../middleware/rateLimiter');

// GET /api/v1/dscrolls
router.get('/', authenticate, dscrollController.getDscrollsFeed);

// POST /api/v1/dscrolls
router.post('/', authenticate, uploadLimiter, uploadVideo.single('video'), dscrollController.createDscroll);

// DELETE /api/v1/dscrolls/:id
router.delete('/:id', authenticate, dscrollController.deleteDscroll);

// POST /api/v1/dscrolls/:id/like
router.post('/:id/like', authenticate, dscrollController.likeDscroll);

// DELETE /api/v1/dscrolls/:id/like
router.delete('/:id/like', authenticate, dscrollController.unlikeDscroll);

module.exports = router;
