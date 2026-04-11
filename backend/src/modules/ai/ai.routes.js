'use strict';

const router = require('express').Router();
const aiController = require('./ai.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/suggest-replies', authenticate, aiController.suggestReplies);

module.exports = router;
