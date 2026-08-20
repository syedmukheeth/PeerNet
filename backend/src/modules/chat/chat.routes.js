'use strict';

const router = require('express').Router();
const chatController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { uploadMedia } = require('../../middleware/upload.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
    createConversationSchema,
    postMessageSchema,
    editMessageSchema,
    reactMessageSchema,
    conversationStateSchema,
} = require('../../validators/chat.validator');

router.use(authenticate);

router.get('/', chatController.getConversations);
router.get('/unread-count', chatController.getUnreadCount);
router.post('/', validate(createConversationSchema), chatController.getOrCreateConversation);

router.get('/:conversationId/messages', chatController.getMessages);
router.post(
    '/:conversationId/messages',
    uploadMedia.single('media'),
    validate(postMessageSchema),
    chatController.postMessage,
);
router.patch('/:conversationId/messages/read', chatController.markSeen);

router.patch('/:conversationId/messages/:messageId', validate(editMessageSchema), chatController.editMessage);
router.delete('/:conversationId/messages/:messageId', chatController.deleteMessage);
router.post('/:conversationId/messages/:messageId/react', validate(reactMessageSchema), chatController.reactMessage);
// Pin, mute and archive, per participant.
router.patch(
    '/:conversationId/state',
    validate(conversationStateSchema),
    chatController.setConversationState,
);
router.delete('/:conversationId', chatController.deleteConversation);

module.exports = router;
