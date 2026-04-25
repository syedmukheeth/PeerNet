'use strict';

const chatService = require('./chat.service');
const { getIO } = require('../../config/socket');
const { uploadToCloudinary } = require('../../utils/cloudinary.utils');

/**
 * Standard broadcast helper to keep REST and Socket events consistent
 */
const broadcastToParticipants = (conversation, event, payload) => {
    const io = getIO();
    if (conversation && conversation.participants) {
        conversation.participants.forEach(p => {
            const pId = p._id ? p._id.toString() : p.toString();
            io.to(`user:${pId}`).emit(event, payload);
        });
    }
    // Also emit to the conversation room
    if (conversation._id) {
        io.to(`chat:${conversation._id.toString()}`).emit(event, payload);
    }
};

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
        const { body, clientSideId, replyTo } = req.body;
        const file = req.file;

        let mediaUrl = '';
        let mediaPublicId = '';
        let mediaType = 'none';

        if (file) {
            const folder = file.mimetype.startsWith('video') ? 'peernet/videos' : 'peernet/chats';
            const result = await uploadToCloudinary(file.path, { folder });
            mediaUrl = result.secure_url;
            mediaPublicId = result.public_id;
            mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
        }

        const { message, conversation, isDuplicate } = await chatService.saveMessage(conversationId, req.user.id, {
            body,
            mediaUrl,
            mediaPublicId,
            mediaType,
            clientSideId,
            replyTo
        });
        
        if (!isDuplicate) {
            const payload = { ...message.toObject(), conversationId };
            broadcastToParticipants(conversation, 'new_message', payload);
            broadcastToParticipants(conversation, 'update_conversation', conversation);
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
        
        const io = getIO();
        io.to(`chat:${conversationId}`).emit('messages_seen', { conversationId, viewerId: req.user.id });
        
        res.json({ success: true, message: 'Marked as seen' });
    } catch (err) {
        next(err);
    }
};

const reactMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const message = await chatService.reactToMessage(messageId, req.user.id, emoji);
        
        const io = getIO();
        io.to(`chat:${message.conversation.toString()}`).emit('message_reacted', {
            messageId,
            reactions: message.reactions,
            senderId: req.user.id
        });

        res.json({ success: true, data: message.reactions });
    } catch (err) {
        next(err);
    }
};

const editMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { body } = req.body;
        const message = await chatService.updateMessage(messageId, req.user.id, body);
        
        const io = getIO();
        io.to(`chat:${message.conversation.toString()}`).emit('message_edited', message);

        res.json({ success: true, data: message });
    } catch (err) {
        next(err);
    }
};

const deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const message = await chatService.deleteMessage(messageId, req.user.id);
        
        const io = getIO();
        io.to(`chat:${message.conversation.toString()}`).emit('message_deleted', { 
            messageId: message._id,
            conversationId: message.conversation
        });

        res.json({ success: true, message: 'Message deleted' });
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
    editMessage,
    deleteMessage,
    reactMessage
};
