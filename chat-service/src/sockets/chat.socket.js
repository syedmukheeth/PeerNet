'use strict';

const { verifyAccessToken } = require('../utils/jwt.utils');
const { getRedis } = require('../config/redis');
const logger = require('../config/logger');

const ONLINE_TTL = 35; // seconds — client must ping every 30s

const initChatSocket = (io) => {
    // JWT auth middleware for Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = verifyAccessToken(token);
            socket.userId = decoded.userId;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        logger.info(`Socket connected: user=${userId} socket=${socket.id}`);

        // Mark online
        const redis = getRedis();
        await redis.setEx(`online:${userId}`, ONLINE_TTL, '1');

        // Join personal room
        socket.join(`user:${userId.toString()}`);
        logger.info(`User ${userId.toString()} joined their personal notification room`);

        // ── Events ──────────────────────────────────────────────────────────────

        // Join a conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });

        // Leave a conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Typing indicator
        socket.on('typing', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('user_typing', { userId });
        });

        socket.on('stop_typing', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { userId });
        });

        // Keepalive ping to refresh online status
        socket.on('ping_online', async () => {
            await redis.setEx(`online:${userId}`, ONLINE_TTL, '1');
        });

        // ── Disconnect ───────────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: user=${userId}`);
            await redis.del(`online:${userId}`);
        });
    });
};

module.exports = { initChatSocket };
