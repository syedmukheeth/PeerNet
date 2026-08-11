'use strict';

const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { writeLimiter } = require('../../middleware/rateLimiter');
const { createFeedbackSchema } = require('../../validators/feedback.validator');

// Validated and rate limited: this endpoint had neither, so any logged-in user
// could write unbounded rows into the collection as fast as they liked.
router.post(
    '/',
    authenticate,
    writeLimiter,
    validate(createFeedbackSchema),
    feedbackController.createFeedback,
);

module.exports = router;
