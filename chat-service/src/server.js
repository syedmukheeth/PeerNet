'use strict';

// Load .env for local dev — on Render, vars are injected into process.env automatically
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // fallback to cwd/.env (no-op if already loaded)

const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const createApp = require('./app');
const connectDB = require('./config/db');
const { connectRedis, getRedisOptional } = require('./config/redis');
const logger = require('./config/logger');
const { initChatSocket } = require('./sockets/chat.socket');
const { setIO } = require('./utils/socket.utils');

const PORT = process.env.CHAT_PORT || 3001;

const bootstrap = async () => {
    // ── 1. Connect MongoDB BEFORE anything else ───────────────────────────────
    //   Queries will now never buffer-timeout because the connection is ready
    //   before the HTTP server opens its port.
    logger.info('Connecting to MongoDB…');
    await connectDB();   // throws & exits on failure — Render will restart

    // ── 2. Connect Redis (optional — log warning but keep going if it fails) ──
    try {
        logger.info('Connecting to Redis…');
        await connectRedis();
    } catch (err) {
        logger.warn(`Redis unavailable: ${err.message} — continuing without cache`);
    }

    // ── 3. Build Express app & HTTP server ────────────────────────────────────
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── 4. Attach Socket.io ───────────────────────────────────────────────────
    const originsArray = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
    const io = new SocketServer(httpServer, {
        cors: {
            origin: originsArray.length > 0 ? originsArray : "*",
            credentials: true,
        },
    });

    const redisClient = getRedisOptional();
    if (redisClient) {
        try {
            const pubClient = redisClient.duplicate();
            const subClient = redisClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.io Redis adapter automatically attached');
        } catch (err) {
            logger.warn(`Failed to connect Redis adapter for Socket.io: ${err.message}`);
        }
    }

    app.set('io', io);
    setIO(io);
    initChatSocket(io);

    // ── 5. Start listening (DB is already connected) ──────────────────────────
    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    logger.info(`PeerNet Chat Microservice running on port ${PORT} [${process.env.NODE_ENV}]`);

    // ── 7. Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        // Log only — do not exit. Transient reconnect events can emit rejections.
        logger.warn(`Unhandled Rejection (non-fatal): ${reason}`);
    });
};

bootstrap().catch((err) => {
    // Fatal startup failure (e.g. MongoDB unreachable) — let Render restart us
    console.error(`FATAL bootstrap error: ${err.message}`);
    process.exit(1);
});
