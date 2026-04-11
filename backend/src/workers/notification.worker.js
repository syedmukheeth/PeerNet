'use strict';

const { kafka } = require('../config/kafka');
const notificationService = require('../modules/notification/notification.service');
const { getRedisOptional } = require('../config/redis');
const logger = require('../config/logger');

const consumer = kafka.consumer({ groupId: 'notification-group' });

const initNotificationWorker = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'post_events', fromBeginning: false });
    await consumer.subscribe({ topic: 'comment_events', fromBeginning: false });
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
                    case 'POST_LIKED':
                        await notificationService.createNotification({
                            recipient: payload.authorId,
                            sender: payload.userId,
                            type: 'like',
                            entityId: payload.postId,
                            entityModel: 'Post',
                        });
                        break;
                    
                    case 'COMMENT_ADDED':
                        await notificationService.createNotification({
                            recipient: payload.postAuthorId,
                            sender: payload.authorId,
                            type: 'comment',
                            entityId: payload.postId,
                            entityModel: 'Post',
                        });
                        break;

                    case 'USER_FOLLOWED':
                        await notificationService.createNotification({
                            recipient: payload.followingId,
                            sender: payload.followerId,
                            type: 'follow',
                            entityId: payload.followingId,
                            entityModel: 'User',
                        });
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
};

module.exports = { initNotificationWorker };
