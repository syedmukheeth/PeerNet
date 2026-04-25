'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

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
    try {
        logger.info('Connecting to Redis...');
        await connectRedis();
    } catch (err) {
        logger.warn(`Redis unavailable: ${err.message} — continuing standalone`);
    }

    // ── 3. Build Server ──────────────────────────────────────────────────────
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── 4. Non-Blocking Service Initialization ──────────────────────────────
    const initServices = async () => {
        try {
            if (isKafkaEnabled) {
                logger.info('Initializing Kafka Producer...');
                await initProducer();
            }
            
            logger.info('Starting Background Workers...');
            await Promise.all([
                initFeedWorker(),
                initNotificationWorker()
            ]);
            
            logger.info('Init: Socket.io setup...');
            await initSocket(httpServer);
            
            logger.info('Init: Cron jobs setup...');
            scheduleStoryCleanup();
            
            logger.info('🚀 ALL background services initialized');
        } catch (err) {
            logger.error(`Non-fatal startup error in background services: ${err.message}`);
        }
    };

    // ── 5. Start listening IMMEDIATELY ───────────────────────────────────────
    httpServer.listen(PORT, () => {
        logger.info(`✨ PeerNet server live on port ${PORT} [${process.env.NODE_ENV}]`);
        initServices();
    });

    // ── 6. Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received — shutting down`);
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
    process.exit(1);
});
