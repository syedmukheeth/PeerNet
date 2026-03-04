'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB.
 * - Validates that MONGO_URI is set and ends with /PeerNet.
 * - Uses production-grade timeouts.
 * - Registers connection lifecycle events.
 * - Throws on failure so the caller can retry or abort.
 */
const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error('MONGO_URI environment variable is not set');
    }

    // Ensure the URI targets the correct database
    if (!uri.includes('/PeerNet')) {
        throw new Error('MONGO_URI must target the /PeerNet database');
    }

    const safeUri = uri.replace(/:([^@]+)@/, ':***@');
    logger.info(`Connecting to MongoDB: ${safeUri}`);

    await mongoose.connect(uri, {
        // How long the driver waits to find an available server
        serverSelectionTimeoutMS: 30000,
        // How long a send/receive on a socket can take
        socketTimeoutMS: 60000,
        // How long to wait for a new connection to be established
        connectTimeoutMS: 30000,
        // Keep the connection alive
        heartbeatFrequencyMS: 10000,
        // Maximum time a connection can sit idle in the pool
        maxIdleTimeMS: 60000,
    });

    logger.info(`MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);

    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected — driver will auto-reconnect'));
    mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
    mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
};

module.exports = connectDB;
