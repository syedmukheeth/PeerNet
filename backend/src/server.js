'use strict';

// Allow self-signed TLS certs (required for Redis Cloud / Atlas free tier on Render)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    // ── Create app & HTTP server first ────────────────────────────────────────
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── Attach Socket.io ───────────────────────────────────────────────────────
    const io = new SocketServer(httpServer, {
        cors: {
            origin: (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()),
            credentials: true,
        },
    });
    app.set('io', io);
    setIO(io);
    initChatSocket(io);

    // ── Start listening FIRST (Render needs the port open) ────────────────────
    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    logger.info(`PeerNet server running on port ${PORT} [${process.env.NODE_ENV}]`);

    // ── Connect databases with retry ────────────────────────────────────────
    const withRetry = async (fn, name, maxRetries = 5, delayMs = 10000) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await fn();
                return;
            } catch (err) {
                if (attempt === maxRetries) {
                    logger.error(`${name} failed after ${maxRetries} attempts: ${err.message}`);
                    throw err;
                }
                logger.warn(`${name} attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
    };
    await withRetry(connectDB, 'MongoDB');
    await withRetry(connectRedis, 'Redis');

    // ── Cron jobs ──────────────────────────────────────────────────────────────
    scheduleStoryCleanup();

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

