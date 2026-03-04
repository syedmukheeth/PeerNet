'use strict';

const { createClient } = require('redis');
const logger = require('./logger');

let redisClient;

const connectRedis = async () => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTLS = url.startsWith('rediss://');

    const clientOptions = {
        url,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    logger.error('Redis: max reconnect attempts reached, giving up');
                    return new Error('Redis reconnect limit reached');
                }
                const delay = Math.min(retries * 300, 3000);
                logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
            },
        },
    };

    // For rediss:// (TLS) — pass a tls options object with verification disabled
    // This is required for Redis Cloud / Upstash free tiers
    if (isTLS) {
        clientOptions.socket.tls = true;
        clientOptions.socket.rejectUnauthorized = false;
        clientOptions.socket.requestCert = true;
    }

    redisClient = createClient(clientOptions);

    redisClient.on('error', (err) => {
        logger.error(`Redis error: ${err.message}`);
    });

    redisClient.on('connect', () => {
        logger.info('Redis connected');
    });

    await redisClient.connect();
    return redisClient;
};

const getRedis = () => {
    if (!redisClient) throw new Error('Redis client not initialised. Call connectRedis() first.');
    return redisClient;
};

/** Returns the Redis client, or null if Redis is not connected. Never throws. */
const getRedisOptional = () => redisClient || null;

module.exports = { connectRedis, getRedis, getRedisOptional };
