'use strict';

// Allow self-signed TLS certs in development (Redis Cloud free tier)
// Remove this in production when using proper certs
if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

require('dotenv').config();

const http = require('http');
const { Server: SocketServer } = require('socket.io');

const createApp = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { initChatSocket } = require('./sockets/chat.socket');
const { scheduleStoryCleanup } = require('./jobs/storyCleanup.job');
const { setIO } = require('./utils/socket.utils');

const PORT = process.env.PORT || 3000;

const bootstrap = async () => {
    // ── Connect databases ──────────────────────────────────────────────────────
    await connectDB();
    await connectRedis();

    // ── Create HTTP server ─────────────────────────────────────────────────────
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── Attach Socket.io ───────────────────────────────────────────────────────
    const io = new SocketServer(httpServer, {
        cors: {
            origin: (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()),
            credentials: true,
        },
    });

    // Expose io for use in services
    app.set('io', io);
    setIO(io);
    initChatSocket(io);

    // ── Cron jobs ──────────────────────────────────────────────────────────────
    scheduleStoryCleanup();

    // ── Start listening ────────────────────────────────────────────────────────
    httpServer.listen(PORT, () => {
        logger.info(`PeerNet server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received. Shutting down gracefully...`);
        httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error(`Unhandled Rejection: ${reason}`);
        process.exit(1);
    });
};

bootstrap().catch((err) => {
    logger.error(`Bootstrap failed: ${err.message}`);
    process.exit(1);
});
