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
    
    // Standardized conversation room
    socket.on('join_conversation', (conversationId) => {
        socket.join(`chat:${conversationId}`);
        logger.info(`User ${userId} joined room: chat:${conversationId}`);
    });
    
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`chat:${conversationId}`);
    });

    socket.on('join_room', (id) => socket.join(id));
    socket.on('leave_room', (id) => socket.leave(id));

    // ── Messaging ──
    
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, body, mediaUrl } = data;
            if (!conversationId || !body) return;

            const { message, conversation } = await chatService.saveMessage(conversationId, userId, { body, mediaUrl });
            
            // Attach tempId for optimistic reconciliation on the sender's side
            const messageWithTemp = { ...message.toObject(), tempId: data.tempId, conversationId };
            
            // 1. Emit to active chat room
            io.to(`chat:${conversationId}`).emit('new_message', messageWithTemp);

            // 2. Emit to each participant's private user room
            if (conversation && conversation.participants) {
                conversation.participants.forEach(pId => {
                    io.to(`user:${pId.toString()}`).emit('new_message', messageWithTemp);
                });
            }
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    // ── Typing Indicators ──
    
    // Support both 'typing_start'/'typing_stop' and 'typing'/'stop_typing' patterns
    socket.on('typing_start', (conversationId) => {
        socket.to(`chat:${conversationId}`).emit('user_typing_start', { userId, conversationId });
    });

    socket.on('typing_stop', (conversationId) => {
        socket.to(`chat:${conversationId}`).emit('user_typing_stop', { userId, conversationId });
    });

    socket.on('typing', ({ conversationId }) => {
        socket.to(`chat:${conversationId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ conversationId }) => {
        socket.to(`chat:${conversationId}`).emit('user_stop_typing', { userId });
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
