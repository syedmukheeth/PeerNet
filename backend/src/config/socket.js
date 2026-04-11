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
        logger.info(`Socket connected: ${socket.id} (User: ${socket.user.id})`);
        registerSocketHandlers(io, socket);
        
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialised');
    return io;
};

module.exports = { initSocket, getIO };
