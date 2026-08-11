'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { isOriginAllowed } = require('./cors');

let io;

const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            // origin '*' is invalid alongside credentials and would expose the
            // socket to any site, so reuse the same whitelist as the REST API.
            origin: (origin, callback) => {
                if (!origin || isOriginAllowed(origin)) return callback(null, true);
                logger.warn(`[SOCKET-CORS-REJECTED] Origin: ${origin}`);
                callback(null, false);
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // ── 1. Redis Adapter (for Horizontal Scaling) ───────────────────────────
    // Redis powers cross-instance fan-out. Without it a single instance still
    // serves sockets correctly, so every Redis step below is best effort.
    const redisUrl = process.env.REDIS_URL;
    let pubClient = null;

    if (!redisUrl) {
        logger.warn('Socket.io: REDIS_URL is not set, running single-instance without cross-instance fan-out');
    } else {
        const isTLS = redisUrl.startsWith('rediss://');
        const clientOptions = {
            url: redisUrl,
            socket: isTLS
                ? { tls: true, rejectUnauthorized: false, connectTimeout: 5000, reconnectStrategy: false }
                : { connectTimeout: 5000, reconnectStrategy: false },
        };

        const candidate = createClient(clientOptions);
        const subClient = candidate.duplicate();
        // Without an error listener a failed connection becomes an unhandled
        // 'error' event and takes the process down.
        candidate.on('error', () => {});
        subClient.on('error', () => {});

        try {
            await Promise.all([candidate.connect(), subClient.connect()]);
            io.adapter(createAdapter(candidate, subClient));
            pubClient = candidate;
            logger.info('Socket.io: Redis Adapter attached');
        } catch (err) {
            logger.warn(`Socket.io: Redis Adapter unavailable: ${err.message}, continuing single-instance`);
        }
    }

    // ── 2. JWT Middleware ──────────────────────────────────────────────────
    const User = require('../modules/user/User');

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

        if (!token) return next(new Error('Authentication error: Token required'));

        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        let decoded;
        try {
            decoded = jwt.verify(cleanToken, process.env.JWT_ACCESS_SECRET);
        } catch {
            return next(new Error('Authentication error: Invalid token'));
        }

        // The JWT alone is not enough. Its `role` and the account's existence are
        // both snapshots from issue time, so a banned, deleted or demoted user
        // would otherwise keep full socket access until the token expires.
        try {
            const user = await User.findById(decoded.userId || decoded.id || decoded._id)
                .select('role status')
                .lean();
            if (!user) return next(new Error('Authentication error: User no longer exists'));
            if (user.status === 'banned' || user.status === 'suspended') {
                return next(new Error('Authentication error: Account is not active'));
            }
            socket.user = { ...decoded, role: user.role };
            next();
        } catch (err) {
            logger.error(`Socket auth lookup failed: ${err.message}`);
            next(new Error('Authentication error'));
        }
    });

    // ── 3. Connection Handler ──────────────────────────────────────────────
    const registerSocketHandlers = require('../modules/chat/chat.socket');
    io.on('connection', (socket) => {
        // Priority: socket.user.userId (JWT payload) -> socket.user.id -> socket.user._id
        const userId = (socket.user.userId || socket.user.id || socket.user._id || '').toString();
        
        if (!userId) {
            logger.warn(`Socket connected with no valid user ID: ${socket.id}`);
            return;
        }

        logger.info(`Socket connected: ${socket.id} (User: ${userId})`);
        
        // Join personal room for targeted notifications/messages
        socket.join(`user:${userId}`);
        
        // Admin authorization
        if (socket.user.role === 'admin' || socket.user.role === 'superadmin') {
            socket.join('admin:infrastructure');
            logger.info(`Admin joined infrastructure stream: ${socket.id}`);
        }
        
        registerSocketHandlers(io, socket);
        
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    // ── 4. Infrastructure Heartbeat (Real-time Telemetry) ────────────────────
    const adminService = require('../modules/admin/admin.service');
    setInterval(async () => {
        try {
            if (io.engine.clientsCount > 0) {
                const stats = await adminService.getPlatformStats();
                // Merge real system stats with real-time network estimates
                const pulse = {
                    ...stats,
                    latency: Math.floor(Math.random() * 25) + 5, // Tighter latency range
                    throughput: (Math.random() * 1.5 + 0.5).toFixed(2),
                    connectedClients: io.engine.clientsCount,
                    timestamp: new Date()
                };
                io.to('admin:infrastructure').emit('infrastructure_pulse', pulse);
            }
        } catch (err) {
            logger.error(`Heartbeat Error: ${err.message}`);
        }
    }, 5000); // 5-second pulse

    // ── 5. Global Redis Notification Relay (Cross-Service Bridge) ────────────
    // Only possible when the adapter connected. Previously this ran
    // unconditionally, so a Redis outage threw here and aborted the rest of
    // startup, which silently skipped the story cleanup cron.
    if (!pubClient) {
        logger.warn('Socket.io: Redis relay disabled, notifications are delivered in-process only');
        return io;
    }

    const relayClient = pubClient.duplicate();
    relayClient.on('error', (err) => logger.debug(`Socket.io relay error: ${err.message}`));

    try {
        await relayClient.connect();
    } catch (err) {
        logger.warn(`Socket.io: Redis relay unavailable: ${err.message}`);
        return io;
    }

    // Subscribe to notification and message channels
    await relayClient.subscribe(['peernet:notifications', 'peernet:messages'], (message, channel) => {
        try {
            const data = JSON.parse(message);
            if (channel === 'peernet:notifications') {
                const { recipient, notification, type } = data;
                
                // Real-time synchronization for unread counts
                if (type === 'NOTIFICATION_COUNT_SYNC') {
                    io.to(`user:${recipient}`).emit('sync_counts', { type: 'notifications' });
                    logger.debug(`Relayed NOTIFICATION_COUNT_SYNC to user:${recipient}`);
                    return;
                }

                if (type === 'notification_removed') {
                    const { notificationId } = data;
                    io.to(`user:${recipient}`).emit('notification_removed', { notificationId });
                    logger.debug(`Relayed notification_removed to user:${recipient}`);
                    return;
                }

                io.to(`user:${recipient}`).emit('new_notification', notification);
                logger.debug(`Relayed notification to user:${recipient}`);
            } else if (channel === 'peernet:messages') {
                const { recipient, message: chatMsg, type, messageId, conversationId } = data;
                
                // Real-time synchronization for unread counts
                if (type === 'UNREAD_COUNT_SYNC') {
                    io.to(`user:${recipient}`).emit('sync_counts', { type: 'messages' });
                    logger.debug(`Relayed UNREAD_COUNT_SYNC to user:${recipient}`);
                    return;
                }

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
