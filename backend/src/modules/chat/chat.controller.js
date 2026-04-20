'use strict';

const chatService = require('./chat.service');

const getConversations = async (req, res, next) => {
    try {
        const conversations = await chatService.getUserConversations(req.user.id);
        res.json({ success: true, data: conversations });
    } catch (err) {
        next(err);
    }
};

const getOrCreateConversation = async (req, res, next) => {
    try {
        const { targetUserId } = req.body;
        const conversation = await chatService.getOrCreateConversation(req.user.id, targetUserId);
        res.json({ success: true, data: conversation });
    } catch (err) {
        next(err);
    }
};

const getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { data, nextCursor, hasMore } = await chatService.getMessages(conversationId, req.user.id, req.query);
        res.json({ success: true, data, nextCursor, hasMore });
    } catch (err) {
        next(err);
    }
};

const postMessage = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { body, tempId } = req.body;
        const file = req.file;

        let mediaUrl = '';
        let mediaPublicId = '';

        if (file) {
            const { uploadToCloudinary } = require('../../utils/cloudinary.utils');
            const result = await uploadToCloudinary(file.path, { folder: 'peernet/chats' });
            mediaUrl = result.secure_url;
            mediaPublicId = result.public_id;
        }

        const { message, conversation } = await chatService.saveMessage(conversationId, req.user.id, {
            body,
            mediaUrl,
            mediaPublicId,
            tempId
        });
        
        // Broadcast to relevant room
        const { getIO } = require('../../config/socket');
        const io = getIO();
        
        // Use consistent 'chat:{id}' room name
        const messageWithTemp = { ...message.toObject(), tempId, conversationId };
        
        // 1. Emit to active chat room (for users currently viewing the chat)
        io.to(`chat:${conversationId}`).emit('new_message', messageWithTemp);

        // 2. Emit to each participant's private user room (for global notifications/badges)
        if (conversation && conversation.participants) {
            conversation.participants.forEach(pId => {
                io.to(`user:${pId.toString()}`).emit('new_message', messageWithTemp);
            });
        }

        res.json({ success: true, data: message });
    } catch (err) {
        next(err);
    }
};

const markSeen = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        await chatService.markAsSeen(conversationId, req.user.id);
        res.json({ success: true, message: 'Marked as seen' });
    } catch (err) {
        next(err);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const count = await chatService.getUnreadCount(req.user.id);
        res.json({ success: true, count });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getConversations,
    getOrCreateConversation,
    getMessages,
    postMessage,
    markSeen,
    getUnreadCount,
};
