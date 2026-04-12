const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/', authenticate, feedbackController.createFeedback);

module.exports = router;
