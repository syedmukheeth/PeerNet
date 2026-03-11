'use strict';

const messageService = require('../services/message.service');
const { parsePagination } = require('../utils/pagination.utils');

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

        // Emit real-time socket event to:
        // 1. The conversation room (for active chat viewers)
        // 2. Each participant's personal room (for notification badges in Layout)
        const io = req.app.get('io');
        if (io) {
            const payload = { ...message.toObject?.() ?? message, conversationId: req.params.id };
            // Active viewers of this conversation
            io.to(`conversation:${req.params.id}`).emit('new_message', payload);
            // Every participant's personal notification channel
            const convo = await require('../services/message.service').getConversationById(req.params.id);
            if (convo) {
                convo.participants.forEach((participantId) => {
                    const pid = participantId.toString();
                    // Don't double-emit to the sender (they already received an optimistic update)
                    io.to(`user:${pid}`).emit('new_message', payload);
                });
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

        // Emit real-time socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${req.params.id}`).emit('message_edited', message);
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

        // Emit real-time socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${req.params.id}`).emit('message_deleted', {
                conversationId: req.params.id,
                messageId: req.params.messageId
            });
        }

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (err) { next(err); }
};

module.exports = { getConversations, createOrGetConversation, getMessages, sendMessage, editMessage, deleteMessage };
