'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Resolve the database name to use.
 *
 * Priority order:
 *   1. The path segment in MONGO_URI  (e.g. mongodb+srv://…/mydb  → "mydb")
 *   2. The DB_NAME environment variable
 *   3. Hard default: "PeerNet"
 *
 * This means ANY valid MongoDB URI works — Render, Atlas, local — without
 * crashing on startup. No hard-coded path check is enforced.
 */
const resolveDbName = (uri) => {
    try {
        const url = new URL(uri);
        // pathname is "/<dbname>" or "/" when no db is specified
        const fromUri = url.pathname.replace(/^\//, '').split('?')[0];
        if (fromUri) return fromUri;
    } catch {
        // Malformed URI — fall through to env / default
    }
    return process.env.DB_NAME || 'PeerNet';
};

/**
 * Connect to MongoDB.
 * - Requires MONGO_URI to be set (but does NOT enforce a specific path).
 * - Derives the database name from the URI, DB_NAME env var, or a safe default.
 * - Uses production-grade timeouts.
 * - Registers connection lifecycle events.
 * - Throws on failure so the caller can retry or abort.
 */
const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error('MONGO_URI environment variable is not set');
    }

    const dbName = resolveDbName(uri);
    const safeUri = uri.replace(/:([^@]+)@/, ':***@');
    logger.info(`Connecting to MongoDB: ${safeUri} (db: ${dbName})`);

    await mongoose.connect(uri, {
        dbName,                         // explicit db — works even if URI path is "/"
        serverSelectionTimeoutMS: 30000, // how long the driver waits for a server
        socketTimeoutMS: 60000, // send/receive timeout per socket
        connectTimeoutMS: 30000, // how long to wait for a new connection
        heartbeatFrequencyMS: 10000, // keep-alive ping interval
        maxIdleTimeMS: 60000, // max idle time before pool reclaims socket
    });

    const { host, name } = mongoose.connection;
    logger.info(`MongoDB connected: ${host} / ${name}`);

    mongoose.connection.on('disconnected', () =>
        logger.warn('MongoDB disconnected — driver will auto-reconnect'),
    );
    mongoose.connection.on('reconnected', () =>
        logger.info('MongoDB reconnected'),
    );
    mongoose.connection.on('error', (err) =>
        logger.error(`MongoDB error: ${err.message}`),
    );
};

module.exports = connectDB;
