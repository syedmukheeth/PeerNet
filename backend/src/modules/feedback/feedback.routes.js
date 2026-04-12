const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { protect } = require('../../middleware/auth');

router.post('/', protect, feedbackController.createFeedback);

module.exports = router;
