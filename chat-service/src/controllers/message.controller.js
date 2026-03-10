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

        // Emit real-time socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${req.params.id}`).emit('new_message', message);
        }

        res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
};

module.exports = { getConversations, createOrGetConversation, getMessages, sendMessage };
