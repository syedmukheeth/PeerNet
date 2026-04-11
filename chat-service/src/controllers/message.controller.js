'use strict';

const messageService = require('../services/message.service');
const { parsePagination } = require('../utils/pagination.utils');
const { getIO } = require('../utils/socket.utils');

const getConversations = async (req, res, next) => {
    try {
        const conversations = await messageService.getUserConversations(req.user._id);
        res.json({ success: true, data: conversations });
    } catch (err) { next(err); }
};

const createOrGetConversation = async (req, res, next) => {
    try {
        const conversation = await messageService.getOrCreateConversation(
            req.user._id,
            req.body.targetUserId,
        );
        res.json({ success: true, data: conversation });
    } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query, 30);
        const result = await messageService.getMessages(req.params.id, req.user._id, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const sendMessage = async (req, res, next) => {
    try {
        const message = await messageService.sendMessage(
            req.params.id,
            req.user._id,
            req.body,
            req.file || null,
        );

        // Emit real-time events
        const io = getIO() || req.app.get('io');
        if (io) {
            const msgObj = message.toObject ? message.toObject() : { ...message };
            const payload = { ...msgObj, conversationId: req.params.id };

            io.to(`conversation:${req.params.id}`).emit('new_message', payload);

            const convo = await messageService.getConversationById(req.params.id);
            if (convo) {
                for (const participantId of convo.participants) {
                    io.to(`user:${participantId.toString()}`).emit('new_message', payload);
                }
            }
        }

        res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
};

const editMessage = async (req, res, next) => {
    try {
        const message = await messageService.editMessage(
            req.params.messageId,
            req.user._id,
            req.body.body
        );

        const io = getIO() || req.app.get('io');
        if (io) {
            const payload = message.toObject ? message.toObject() : { ...message };
            io.to(`conversation:${req.params.id}`).emit('message_edited', { ...payload, conversationId: req.params.id });
        }

        res.json({ success: true, data: message });
    } catch (err) { next(err); }
};

const deleteMessage = async (req, res, next) => {
    try {
        await messageService.deleteMessage(
            req.params.messageId,
            req.user._id
        );

        const io = getIO() || req.app.get('io');
        if (io) {
            io.to(`conversation:${req.params.id}`).emit('message_deleted', {
                conversationId: req.params.id,
                messageId: req.params.messageId,
            });
        }

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
    try {
        await messageService.markMessagesAsRead(req.params.id, req.user._id);

        const io = getIO() || req.app.get('io');
        if (io) {
            io.to(`conversation:${req.params.id}`).emit('messages_read', {
                conversationId: req.params.id,
                readBy: req.user._id
            });
        }

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (err) { next(err); }
};

const getSuggestions = async (req, res, next) => {
    try {
        const suggestions = await messageService.getSmartReplies(req.params.id);
        res.status(200).send({ success: true, suggestions });
    } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const count = await messageService.getTotalUnreadCount(req.user._id);
        res.json({ success: true, count });
    } catch (err) { next(err); }
};

module.exports = {
    getConversations,
    createOrGetConversation,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    getSuggestions,
    getUnreadCount,
};
