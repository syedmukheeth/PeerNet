'use strict';

// Load .env for local dev — on Render, vars are injected into process.env automatically
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // fallback to cwd/.env (no-op if already loaded)

const http = require('http');

const createApp = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { scheduleStoryCleanup } = require('./jobs/storyCleanup.job');
const { initSocket } = require('./config/socket');
const { initProducer, disconnectProducer } = require('./config/kafka');
const { initFeedWorker } = require('./workers/feed.worker');
const { initNotificationWorker } = require('./workers/notification.worker');

const PORT = process.env.PORT || 3000;

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

    // ── 4. Init Kafka & Workers ───────────────────────────────────────────────
    logger.info('Initializing Kafka…');
    await initProducer();
    await initFeedWorker();
    await initNotificationWorker();

    // ── 5. Init Socket.io ─────────────────────────────────────────────────────
    await initSocket(httpServer);

    // ── 6. Start listening (DB is already connected) ──────────────────────────
    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    logger.info(`PeerNet server running on port ${PORT} [${process.env.NODE_ENV}]`);

    // ── 7. Cron jobs ──────────────────────────────────────────────────────────
    scheduleStoryCleanup();

    // ── 7. Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        httpServer.close(async () => {
            logger.info('HTTP server closed');
            await disconnectProducer();
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
