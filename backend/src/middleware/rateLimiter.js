'use strict';

const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const handler = (_req, _res, next, _options) =>
    next(new ApiError(429, 'Too many requests, please try again later'));

// Bypass in local dev / test — real limits apply everywhere else
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const skipLimiter = (_req, _res, next) => next();

const globalLimiter = isDev ? skipLimiter : rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

const authLimiter = isDev ? skipLimiter : rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

const uploadLimiter = isDev ? skipLimiter : rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
