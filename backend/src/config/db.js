'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info(`MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('disconnected', () => {
            isConnected = false;
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            isConnected = true;
            logger.info('MongoDB reconnected');
        });

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB error: ${err.message}`);
        });
    } catch (err) {
        logger.error(`MongoDB connection failed: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
