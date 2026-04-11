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

const markSeen = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        await chatService.markAsSeen(conversationId, req.user.id);
        res.json({ success: true, message: 'Marked as seen' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getConversations,
    getOrCreateConversation,
    getMessages,
    markSeen,
};
