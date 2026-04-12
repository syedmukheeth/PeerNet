'use strict';

const router = require('express').Router();
const chatController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', chatController.getConversations);
router.post('/', chatController.getOrCreateConversation);
router.get('/:conversationId/messages', chatController.getMessages);
router.patch('/:conversationId/seen', chatController.markSeen);

module.exports = router;
