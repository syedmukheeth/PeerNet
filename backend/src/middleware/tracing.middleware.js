'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Tracing Middleware:
 * Generates a unique requestId for every request and stores it in AsyncLocalStorage.
 * This ID is later used by the logger to automatically correlate all logs for a single request.
 */
const tracingMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Set for downstream access and response tracking
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);

    asyncLocalStorage.run({ requestId }, () => {
        next();
    });
};

const getRequestId = () => {
    const store = asyncLocalStorage.getStore();
    return store ? store.requestId : null;
};

module.exports = { tracingMiddleware, getRequestId };
