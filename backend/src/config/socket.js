'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust to specific origins in production
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // ── 1. Redis Adapter (for Horizontal Scaling) ───────────────────────────
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTLS = redisUrl.startsWith('rediss://');
    
    const clientOptions = {
        url: redisUrl,
        socket: isTLS ? { tls: true, rejectUnauthorized: false } : {},
    };

    const pubClient = createClient(clientOptions);
    const subClient = pubClient.duplicate();

    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io: Redis Adapter attached');
    } catch (err) {
        logger.error(`Socket.io: Redis Adapter failed: ${err.message}`);
    }

    // ── 2. JWT Middleware ──────────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        
        if (!token) return next(new Error('Authentication error: Token required'));

        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        jwt.verify(cleanToken, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
            if (err) return next(new Error('Authentication error: Invalid token'));
            socket.user = decoded; // { id, role, ... }
            next();
        });
    });

    // ── 3. Connection Handler ──────────────────────────────────────────────
    const registerSocketHandlers = require('../modules/chat/chat.socket');
    io.on('connection', (socket) => {
        const userId = socket.user.id || socket.user._id;
        logger.info(`Socket connected: ${socket.id} (User: ${userId})`);
        
        // Join personal room for targeted notifications/messages
        socket.join(`user:${userId}`);
        
        registerSocketHandlers(io, socket);
        
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    // ── 4. Global Redis Notification Relay (Cross-Service Bridge) ────────────
    const relayClient = pubClient.duplicate();
    await relayClient.connect();
    
    // Subscribe to notification and message channels
    await relayClient.subscribe(['peernet:notifications', 'peernet:messages'], (message, channel) => {
        try {
            const data = JSON.parse(message);
            if (channel === 'peernet:notifications') {
                // Parse: { recipient, notification }
                const { recipient, notification } = data;
                io.to(`user:${recipient}`).emit('new_notification', notification);
                logger.debug(`Relayed notification to user:${recipient}`);
            } else if (channel === 'peernet:messages') {
                // Parse: { recipient, message, type?, messageId?, conversationId? }
                const { recipient, message: chatMsg, type, messageId, conversationId } = data;
                
                if (type === 'MESSAGE_EDITED') {
                    io.to(`user:${recipient}`).emit('message_edited', chatMsg);
                } else if (type === 'MESSAGE_DELETED') {
                    io.to(`user:${recipient}`).emit('message_deleted', { messageId, conversationId });
                } else {
                    // Default: new message
                    io.to(`user:${recipient}`).emit('new_message', chatMsg);
                }
                logger.debug(`Relayed ${type || 'new_message'} to user:${recipient}`);
            }
        } catch (err) {
            logger.error(`Relay Error [${channel}]: ${err.message}`);
        }
    });
    logger.info('Socket.io: Redis Relay Subscriber active');

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialised');
    return io;
};

module.exports = { initSocket, getIO };
