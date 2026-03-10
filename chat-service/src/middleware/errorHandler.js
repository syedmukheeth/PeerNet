'use strict';

const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let error = err;

    // Wrap non-ApiErrors
    if (!(error instanceof ApiError)) {
        const statusCode =
            error.statusCode || error.status || 500;
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, false, err.stack);
    }

    const { statusCode, message, isOperational } = error;

    // Log non-operational (programmer) errors
    if (!isOperational || statusCode >= 500) {
        logger.error({
            message: error.message,
            stack: error.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
    }

    const response = {
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
