'use strict';

const router = require('express').Router();
const chatController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');

router.use(authenticate);

router.get('/', chatController.getConversations);
router.get('/unread-count', chatController.getUnreadCount);
router.post('/', chatController.getOrCreateConversation);
router.get('/:conversationId/messages', chatController.getMessages);
router.post('/:conversationId/messages', uploadMedia.single('media'), chatController.postMessage);
router.patch('/:conversationId/messages/read', chatController.markSeen);

module.exports = router;
