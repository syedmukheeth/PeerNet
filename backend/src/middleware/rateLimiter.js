'use strict';

const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const handler = (_req, _res, next, _options) =>
    next(new ApiError(429, 'Too many requests, please try again later'));

// Dummy middleware that skips rate limiting
const skipLimiter = (req, res, next) => next();

const globalLimiter = skipLimiter;
const authLimiter = skipLimiter;
const uploadLimiter = skipLimiter;

module.exports = { globalLimiter, authLimiter, uploadLimiter };
