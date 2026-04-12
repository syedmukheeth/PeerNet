'use strict';

const { kafka } = require('../config/kafka');
const notificationService = require('../modules/notification/notification.service');
const { getRedisOptional } = require('../config/redis');
const logger = require('../config/logger');

const consumer = kafka.consumer({ groupId: 'notification-group' });

const initNotificationWorker = async () => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'post_events', fromBeginning: false });
        await consumer.subscribe({ topic: 'comment_events', fromBeginning: false });
        await consumer.subscribe({ topic: 'dscroll_events', fromBeginning: false });
        await consumer.subscribe({ topic: 'user_events', fromBeginning: false });

        await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            const { eventId, type, payload } = event;

            // 1. Idempotency Check
            const redis = getRedisOptional();
            if (redis) {
                const isProcessed = await redis.get(`processed_notif:${eventId}`);
                if (isProcessed) return;
            }

            logger.info(`NotificationWorker: Processing ${type}`);

            try {
                switch (type) {
                    case 'POST_LIKED': {
                        const { authorId, userId, postId } = payload;
                        if (!authorId || !userId || !postId) {
                            logger.warn(`NotificationWorker: Missing data for POST_LIKED: ${JSON.stringify(payload)}`);
                            break;
                        }
                    /* Core UI Notifications are now handled DIRECTLY in services for instant speed.
                       Kafka is reserved for non-latency-sensitive background tasks. */
                    
                    case 'POST_CREATED':
                        // Logic for AI post analysis could stay here if needed
                        break;

                    default:
                        // Some events (like POST_CREATED or UNLIKED) might not trigger notifications
                        break;
                }

                // 2. Mark as processed
                if (redis) {
                    await redis.setEx(`processed_notif:${eventId}`, 86400, 'true');
                }
            } catch (err) {
                logger.error(`NotificationWorker: Error processing ${eventId}: ${err.message}`);
            }
        },
    });

    logger.info('Kafka: Notification Worker started');
    } catch (err) {
        logger.error(`Kafka: Notification Worker failed to connect: ${err.message}`);
    }
};

module.exports = { initNotificationWorker };
