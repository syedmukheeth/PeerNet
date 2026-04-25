'use strict';

const { kafka } = require('../config/kafka');
const { fanoutPost, updatePostScore } = require('../modules/feed/feed.fanout');
const Post = require('../modules/post/Post');
const User = require('../modules/user/User');
const { getRedisOptional } = require('../config/redis');
const logger = require('../config/logger');

const consumer = kafka.consumer({ groupId: 'feed-group' });

const initFeedWorker = async () => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'post_events', fromBeginning: false });
        await consumer.subscribe({ topic: 'comment_events', fromBeginning: false });

        await consumer.run({
        eachMessage: async ({ topic: _topic, partition: _partition, message }) => {
            const event = JSON.parse(message.value.toString());
            const { eventId, type, payload } = event;

            // 1. Idempotency Check (Redis-based)
            const redis = getRedisOptional();
            if (redis) {
                const isProcessed = await redis.get(`processed_event:${eventId}`);
                if (isProcessed) {
                    logger.warn(`FeedWorker: Event ${eventId} already processed. Skipping.`);
                    return;
                }
            }

            logger.info(`FeedWorker: Processing ${type} [${eventId}]`);

            try {
                switch (type) {
                    case 'POST_CREATED':
                        await fanoutPost(payload);
                        break;
                    
                    case 'POST_LIKED':
                    case 'POST_UNLIKED': {
                        const post = await Post.findById(payload.postId);
                        if (post) {
                            await updatePostScore(post);
                            
                            // Behavioral Personalization: Update User Category Affinity
                            if (type === 'POST_LIKED' && post.tags && post.tags.length > 0) {
                                const update = {};
                                post.tags.forEach(tag => {
                                    update[`categoryAffinity.${tag}`] = 1;
                                });
                                await User.findByIdAndUpdate(payload.userId, { $inc: update });
                            }

                            // Invalidate individual post cache
                            if (redis) await redis.del(`post:${payload.postId}`);
                        }
                        break;
                    }
                    
                    case 'COMMENT_ADDED':
                    case 'COMMENT_DELETED': {
                        const post = await Post.findById(payload.postId);
                        if (post) {
                            await updatePostScore(post);
                            if (redis) await redis.del(`post:${payload.postId}`);
                        }
                        break;
                    }

                    default:
                        logger.warn(`FeedWorker: Unhandled event type: ${type}`);
                }

                // 2. Mark as processed for 24h
                if (redis) {
                    await redis.setEx(`processed_event:${eventId}`, 86400, 'true');
                }
            } catch (err) {
                logger.error(`FeedWorker: Error processing ${eventId}: ${err.message}`);
                // In production, you might send to a DLQ (Dead Letter Queue) here
                throw err; // Cause Kafkajs to retry
            }
        },
    });

    logger.info('Kafka: Feed Worker started');
    } catch (err) {
        logger.error(`Kafka: Feed Worker failed to connect: ${err.message}`);
    }
};

module.exports = { initFeedWorker };
