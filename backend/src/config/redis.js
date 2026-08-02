'use strict';

const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let retryTimer = null;

// How long to wait before retrying a connection that failed at boot.
const RETRY_INTERVAL_MS = 30_000;
// Retries allowed during the very first connect. Kept low so a dead Redis
// cannot stall server boot; later reconnects get a longer budget.
const INITIAL_CONNECT_RETRIES = 2;
const RECONNECT_RETRIES = 10;

let hasConnectedOnce = false;

const buildClient = (url) => {
    const isTLS = url.startsWith('rediss://');

    const clientOptions = {
        url,
        socket: {
            connectTimeout: 5000,
            reconnectStrategy: (retries) => {
                const budget = hasConnectedOnce ? RECONNECT_RETRIES : INITIAL_CONNECT_RETRIES;
                if (retries > budget) {
                    return new Error('Redis reconnect limit reached');
                }
                return Math.min(retries * 300, 3000);
            },
        },
    };

    // rediss:// (TLS) needs an explicit tls flag. Redis Cloud and Upstash free
    // tiers serve certs that do not validate against the default CA bundle.
    if (isTLS) {
        clientOptions.socket.tls = true;
        clientOptions.socket.rejectUnauthorized = false;
    }

    const client = createClient(clientOptions);

    // Without a listener, node-redis turns connection errors into unhandled
    // 'error' events and crashes the process.
    client.on('error', (err) => {
        logger.debug(`Redis error: ${err.message}`);
    });

    client.on('ready', () => {
        hasConnectedOnce = true;
        logger.info('Redis connected');
    });

    return client;
};

const scheduleRetry = (url) => {
    if (retryTimer) return;
    retryTimer = setTimeout(async () => {
        retryTimer = null;
        try {
            const client = buildClient(url);
            await client.connect();
            redisClient = client;
        } catch (err) {
            logger.debug(`Redis retry failed: ${err.message}`);
            scheduleRetry(url);
        }
    }, RETRY_INTERVAL_MS);
    // Do not hold the event loop open just for the retry timer.
    if (retryTimer.unref) retryTimer.unref();
};

/**
 * Attempts to connect to Redis. Never throws and never blocks boot for long:
 * Redis is a cache and a pub/sub transport here, not a source of truth.
 * If the first attempt fails, a background retry keeps trying.
 */
const connectRedis = async () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        logger.warn('REDIS_URL is not set, running without Redis (cache and presence disabled)');
        return null;
    }

    try {
        const client = buildClient(url);
        await client.connect();
        redisClient = client;
        return redisClient;
    } catch (err) {
        logger.warn(`Redis unavailable at boot: ${err.message}, retrying in background`);
        redisClient = null;
        scheduleRetry(url);
        return null;
    }
};

/**
 * Returns a usable Redis client, or throws if Redis is not connected.
 * Prefer getRedisOptional() unless the caller genuinely cannot proceed.
 */
const getRedis = () => {
    if (!redisClient || !redisClient.isReady) {
        throw new Error('Redis is not connected');
    }
    return redisClient;
};

/**
 * Returns the Redis client only when it is actually ready to accept commands,
 * otherwise null. A client that exists but is closed still rejects every
 * command, so existence alone is not a safe check.
 */
const getRedisOptional = () => (redisClient && redisClient.isReady ? redisClient : null);

module.exports = { connectRedis, getRedis, getRedisOptional };
