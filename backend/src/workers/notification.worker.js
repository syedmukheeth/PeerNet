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
                try {
                    const event = JSON.parse(message.value.toString());
                    const { eventId, type, payload } = event;

                    // 1. Idempotency Check
                    const redis = getRedisOptional();
                    if (redis) {
                        const isProcessed = await redis.get(`processed_notif:${eventId}`);
                        if (isProcessed) return;
                    }

                    logger.info(`NotificationWorker: Processing ${type}`);

                    switch (type) {
                        case 'POST_CREATED':
                            // Logic for AI post analysis or image moderation could go here
                            break;
                        
                        default:
                            // Core UI notifications (likes, comments) are now handled directly in services for speed.
                            break;
                    }

                    // 2. Mark as processed
                    if (redis && eventId) {
                        await redis.setEx(`processed_notif:${eventId}`, 86400, 'true');
                    }
                } catch (err) {
                    logger.error(`NotificationWorker: Error processing message: ${err.message}`);
                }
            },
        });

    logger.info('Kafka: Notification Worker started');
    } catch (err) {
        logger.error(`Kafka: Notification Worker failed to connect: ${err.message}`);
    }
};

module.exports = { initNotificationWorker };
