'use strict';

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const kafka = new Kafka({
    clientId: 'peernet-api',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const producer = kafka.producer({
    // Enable idempotence for exactly-once semantics
    // This ensures no duplicates due to network retries
    idempotent: true,
    maxInFlightRequests: 1,
});

const initProducer = async () => {
    try {
        await producer.connect();
        logger.info('Kafka: Producer connected');
    } catch (err) {
        logger.error(`Kafka: Producer failed to connect: ${err.message}`);
    }
};

/**
 * Publishes an event to a Kafka topic.
 * @param {string} topic - Topic name (e.g. 'post_events')
 * @param {string} type - Event type (e.g. 'POST_CREATED')
 * @param {object} payload - Event data
 */
const publishEvent = async (topic, type, payload) => {
    try {
        const eventId = uuidv4();
        const message = {
            eventId,
            type,
            payload,
            timestamp: new Date().toISOString(),
        };

        await producer.send({
            topic,
            messages: [
                {
                    key: payload.userId || payload.authorId || uuidv4(),
                    value: JSON.stringify(message),
                },
            ],
        });

        logger.info(`Kafka: Event published to ${topic}: ${type} [${eventId}]`);
    } catch (err) {
        logger.error(`Kafka: Failed to publish event: ${err.message}`);
    }
};

const disconnectProducer = async () => {
    await producer.disconnect();
};

module.exports = { initProducer, publishEvent, disconnectProducer, kafka };
