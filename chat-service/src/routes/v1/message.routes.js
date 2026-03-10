'use strict';

const router = require('express').Router();
const messageController = require('../../controllers/message.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');

// GET /api/v1/conversations
router.get('/', authenticate, messageController.getConversations);

// POST /api/v1/conversations  (create or get existing)
router.post('/', authenticate, messageController.createOrGetConversation);

// GET /api/v1/conversations/:id/messages
router.get('/:id/messages', authenticate, messageController.getMessages);

// POST /api/v1/conversations/:id/messages
router.post(
    '/:id/messages',
    authenticate,
    uploadMedia.single('media'),
    messageController.sendMessage,
);

module.exports = router;
