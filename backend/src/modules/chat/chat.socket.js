'use strict';

const chatService = require('./chat.service');
const logger = require('../../config/logger');
const { getRedisOptional } = require('../../config/redis');

const ONLINE_TTL = 35; // seconds — client should ping every 30s

module.exports = (io, socket) => {
    const userId = (socket.user.userId || socket.user.id || socket.user._id || '').toString();

    // ── Presence / Online Status ──
    const markOnline = async () => {
        const redis = getRedisOptional();
        if (redis && userId) {
            await redis.setEx(`online:${userId}`, ONLINE_TTL, '1');
        }
    };
    
    // Initial online pulse
    markOnline();

    // ── Room Management ──
    
    // Support both 'join_room' (new) and 'join_conversation' (legacy)
    socket.on('join_room', (conversationId) => {
        socket.join(conversationId);
        logger.info(`User ${userId} joined room: ${conversationId}`);
    });

    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        logger.info(`User ${userId} joined legacy conversation room: ${conversationId}`);
    });

    socket.on('leave_room', (conversationId) => socket.leave(conversationId));
    socket.on('leave_conversation', (conversationId) => socket.leave(`conversation:${conversationId}`));

    // ── Messaging ──
    
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, body, mediaUrl } = data;
            if (!conversationId || !body) return;

            const message = await chatService.saveMessage(conversationId, userId, { body, mediaUrl });
            
            // Attach tempId for optimistic reconciliation on the sender's side
            const messageWithTemp = { ...message.toObject(), tempId: data.tempId, conversationId };
            
            io.to(conversationId).emit('new_message', messageWithTemp);
            io.to(`conversation:${conversationId}`).emit('new_message', messageWithTemp);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    // ── Typing Indicators ──
    
    // Support both 'typing_start'/'typing_stop' and 'typing'/'stop_typing' patterns
    socket.on('typing_start', (conversationId) => {
        socket.to(conversationId).emit('user_typing_start', { userId, conversationId });
    });

    socket.on('typing_stop', (conversationId) => {
        socket.to(conversationId).emit('user_typing_stop', { userId, conversationId });
    });

    socket.on('typing', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { userId });
    });

    // ── Maintenance ──
    
    socket.on('ping_online', () => markOnline());

    socket.on('disconnect', async () => {
        logger.info(`Socket disconnected: user=${userId}`);
        const redis = getRedisOptional();
        if (redis && userId) {
            await redis.del(`online:${userId}`);
        }
    });
};
