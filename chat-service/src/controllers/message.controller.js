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
            // Build a plain-object payload with conversationId attached
            const msgObj = message.toObject ? message.toObject() : { ...message };
            const payload = { ...msgObj, conversationId: req.params.id };

            // 1. Broadcast to the conversation room (active chat viewers get the message inline)
            io.to(`conversation:${req.params.id}`).emit('new_message', payload);

            // 2. Also emit to every participant's personal room so Layout.jsx
            //    can show the notification badge / toast even on other pages.
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

module.exports = { getConversations, createOrGetConversation, getMessages, sendMessage, editMessage, deleteMessage };
