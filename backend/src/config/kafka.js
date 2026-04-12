'use strict';

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const isKafkaEnabled = !!process.env.KAFKA_BROKER;

// ── 👻 GHOST KAFKA (MOCK OBJECT) ─────────────────────────────────────────────
// This ensures that workers calling kafka.consumer() or kafka.producer()
// at the top level do not crash with a TypeError when Kafka is disabled.
const ghostKafka = {
    producer: () => ({
        connect: async () => logger.warn('Kafka: [STUB] Producer connect (Bypassed)'),
        disconnect: async () => {},
        send: async ({ topic, messages }) => {
            logger.info(`Kafka: [STUB] Published ${messages.length} messages to ${topic}`);
            return [];
        }
    }),
    consumer: ({ groupId }) => ({
        connect: async () => logger.warn(`Kafka: [STUB] Consumer connect for ${groupId} (Bypassed)`),
        disconnect: async () => {},
        subscribe: async ({ topic }) => logger.info(`Kafka: [STUB] Subscribed to ${topic}`),
        run: async ({ eachMessage }) => logger.info(`Kafka: [STUB] Worker loop started for ${groupId}`),
        stop: async () => {},
        pause: () => {},
        resume: () => {},
    })
};

let kafka = null;
let producer = null;

if (isKafkaEnabled) {
    try {
        kafka = new Kafka({
            clientId: 'peernet-api',
            brokers: [process.env.KAFKA_BROKER],
            retry: {
                initialRetryTime: 300,
                retries: 2 // Ultra-fast retry for prod
            }
        });

        producer = kafka.producer({
            idempotent: true,
            maxInFlightRequests: 1,
        });
    } catch (err) {
        logger.error(`Kafka: Failed to initialize Kafka client: ${err.message}`);
        kafka = ghostKafka; // Fallback to ghost on init failure
    }
} else {
    logger.warn('Kafka: DISBALED. Activating Ghost Kafka (Mock Mode).');
    kafka = ghostKafka;
    // We still define a producer stub for internal logic
    producer = kafka.producer();
}

/**
 * Connects the producer to the broker.
 */
const initProducer = async () => {
    try {
        await producer.connect();
        if (isKafkaEnabled) logger.info('Kafka: Real Producer connected');
    } catch (err) {
        logger.error(`Kafka: Producer connection failed (Non-Fatal): ${err.message}`);
    }
};

/**
 * High-performance event publishing.
 */
const publishEvent = async (topic, type, payload) => {
    const eventId = uuidv4();
    const message = {
        eventId,
        type,
        payload,
        timestamp: new Date().toISOString(),
    };

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
        if (isKafkaEnabled) logger.info(`Kafka: Published to ${topic}: ${type}`);
    } catch (err) {
        logger.error(`Kafka: Publish FAILED: ${err.message}`);
    }
};

const disconnectProducer = async () => {
    if (producer) {
        await producer.disconnect();
    }
};

module.exports = { initProducer, publishEvent, disconnectProducer, kafka, isKafkaEnabled };
