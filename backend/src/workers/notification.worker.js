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
                        if (authorId.toString() === userId.toString()) {
                            logger.debug(`NotificationWorker: Skipping self-like for post ${postId}`);
                            break;
                        }
                        await notificationService.createNotification({
                            recipient: authorId,
                            sender: userId,
                            type: 'like',
                            entityId: postId,
                            entityModel: 'Post',
                        });
                        break;
                    }
                    
                    case 'COMMENT_ADDED':
                        await notificationService.createNotification({
                            recipient: payload.postAuthorId,
                            sender: payload.authorId,
                            type: 'comment',
                            entityId: payload.postId,
                            entityModel: payload.postModel || 'Post',
                        });
                        break;

                    case 'REPLY_ADDED':
                        await notificationService.createNotification({
                            recipient: payload.parentCommentAuthorId,
                            sender: payload.authorId,
                            type: 'reply',
                            entityId: payload.commentId,
                            entityModel: 'Comment',
                        });
                        break;

                    case 'COMMENT_LIKED':
                        await notificationService.createNotification({
                            recipient: payload.authorId,
                            sender: payload.userId,
                            type: 'like',
                            entityId: payload.commentId,
                            entityModel: 'Comment',
                        });
                        break;

                    case 'DSCROLL_LIKED':
                        await notificationService.createNotification({
                            recipient: payload.authorId,
                            sender: payload.userId,
                            type: 'like',
                            entityId: payload.dscrollId,
                            entityModel: 'Dscroll',
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
    } catch (err) {
        logger.error(`Kafka: Notification Worker failed to connect: ${err.message}`);
    }
};

module.exports = { initNotificationWorker };
