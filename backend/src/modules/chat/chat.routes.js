'use strict';

const router = require('express').Router();
const chatController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.patch('/conversations/:conversationId/seen', chatController.markSeen);

module.exports = router;
