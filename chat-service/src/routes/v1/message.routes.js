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
// PUT /api/v1/conversations/:id/messages/:messageId
router.put(
    '/:id/messages/:messageId',
    authenticate,
    messageController.editMessage
);

// DELETE /api/v1/conversations/:id/messages/:messageId
router.delete(
    '/:id/messages/:messageId',
    authenticate,
    messageController.deleteMessage
);

// PATCH /api/v1/conversations/:id/messages/read
router.patch(
    '/:id/messages/read',
    authenticate,
    messageController.markAsRead
);

// GET /api/v1/conversations/:id/suggestions
router.get('/:id/suggestions', authenticate, messageController.getSuggestions);

module.exports = router;
