'use strict';

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// ── 🚀 OPTIONAL KAFKA LOGIC ──────────────────────────────────────────────────
// Only initialize if a broker is explicitly defined. 
// On many cloud platforms (Render), we don't want to stall on localhost:9092.
const isKafkaEnabled = !!process.env.KAFKA_BROKER;

let kafka = null;
let producer = null;

if (isKafkaEnabled) {
    kafka = new Kafka({
        clientId: 'peernet-api',
        brokers: [process.env.KAFKA_BROKER],
        retry: {
            initialRetryTime: 300,
            retries: 3 // Reduced retries to prevent startup hangs
        }
    });

    producer = kafka.producer({
        idempotent: true,
        maxInFlightRequests: 1,
    });
} else {
    logger.warn('Kafka: DISBALED (KAFKA_BROKER env var missing). Operating in standalone mode.');
}

/**
 * Connects the producer to the broker.
 * Fails gracefully if Kafka is unavailable.
 */
const initProducer = async () => {
    if (!isKafkaEnabled) return;
    try {
        await producer.connect();
        logger.info('Kafka: Producer connected');
    } catch (err) {
        logger.error(`Kafka: Producer connection failed (Non-Fatal): ${err.message}`);
    }
};

/**
 * High-performance event publishing.
 * In Standalone mode, this simply logs the event instead of failing.
 */
const publishEvent = async (topic, type, payload) => {
    const eventId = uuidv4();
    const message = {
        eventId,
        type,
        payload,
        timestamp: new Date().toISOString(),
    };

    if (!isKafkaEnabled) {
        // Standalone Fallback
        logger.info(`[OFFLINE-EVT] ${topic}: ${type} [${eventId}]`);
        return;
    }

    try {
        await producer.send({
            topic,
            messages: [
                {
                    key: payload.userId || payload.authorId || uuidv4(),
                    value: JSON.stringify(message),
                },
            ],
        });
        logger.info(`Kafka: Published to ${topic}: ${type}`);
    } catch (err) {
        logger.error(`Kafka: Publish FAILED: ${err.message}`);
    }
};

const disconnectProducer = async () => {
    if (isKafkaEnabled && producer) {
        await producer.disconnect();
    }
};

module.exports = { initProducer, publishEvent, disconnectProducer, kafka, isKafkaEnabled };
