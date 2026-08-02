'use strict';

const path = require('path');
// dotenv never overwrites a variable that is already set, so the repo root .env
// wins over backend/.env for any key both files define.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

// Runs before the requires below because config/kafka.js reads KAFKA_BROKER at
// module load time.
const { validateEnv } = require('./config/env');
validateEnv();

const http = require('http');
const createApp = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { scheduleStoryCleanup } = require('./jobs/storyCleanup.job');
const { initSocket } = require('./config/socket');
const { initProducer, disconnectProducer, isKafkaEnabled } = require('./config/kafka');
const { initFeedWorker } = require('./workers/feed.worker');
const { initNotificationWorker } = require('./workers/notification.worker');

const PORT = process.env.PORT || 3000;

const bootstrap = async () => {
    // ── 1. Connect MongoDB (HARD BLOCKER) ────────────────────────────────────
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // ── 2. Connect Redis (OPTIONAL) ──────────────────────────────────────────
    // connectRedis never throws and retries in the background, so a Redis
    // outage degrades caching instead of blocking boot.
    logger.info('Connecting to Redis...');
    await connectRedis();

    // ── 3. Build Server ──────────────────────────────────────────────────────
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── 4. Non-Blocking Service Initialization ──────────────────────────────
    // Each step is isolated so that one failing dependency cannot skip the ones
    // after it. Wrapping the whole block in a single try previously meant a
    // Redis outage during socket setup silently cancelled the story cleanup cron.
    const runStep = async (name, fn) => {
        try {
            logger.info(`Init: ${name}...`);
            await fn();
        } catch (err) {
            logger.error(`Init: ${name} failed (non-fatal): ${err.message}`);
        }
    };

    const initServices = async () => {
        if (isKafkaEnabled) {
            await runStep('Kafka producer', initProducer);
        }

        await runStep('Background workers', () =>
            Promise.all([initFeedWorker(), initNotificationWorker()]));

        await runStep('Socket.io', () => initSocket(httpServer));

        await runStep('Cron jobs', scheduleStoryCleanup);

        logger.info('🚀 Background service initialization complete');
    };

    // ── 5. Start listening IMMEDIATELY ───────────────────────────────────────
    httpServer.listen(PORT, () => {
        logger.info(`✨ PeerNet server live on port ${PORT} [${process.env.NODE_ENV}]`);
        initServices();
    });

    // ── 6. Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down`);
        httpServer.close(async () => {
            logger.info('HTTP server closed');
            await disconnectProducer();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.error(`FATAL: Uncaught Exception: ${err.message}`, { stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.warn(`Unhandled Rejection (Non-Fatal): ${reason}`);
    });
};

bootstrap().catch((err) => {
    logger.error(`FATAL BOOTSTRAP FAILURE: ${err.message}`);
    // logger transports flush asynchronously, so give them a tick before exiting
    // or the reason for the crash never reaches the Render logs.
    setTimeout(() => process.exit(1), 100);
});
