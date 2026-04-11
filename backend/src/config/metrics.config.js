'use strict';

const promClient = require('prom-client');
const logger = require('./logger');

// ── Prometheus setup ─────────────────────────────────────────────────────────
const register = new promClient.Registry();

// Default Node.js metrics (CPU, Memory, Event Loop)
promClient.collectDefaultMetrics({
    register,
    prefix: 'peernet_backend_',
});

// Custom HTTP Request Duration Histogram
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10], // seconds
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);

/**
 * Metrics Middleware:
 * Records request duration and increments total request count.
 */
const metricsMiddleware = (req, res, next) => {
    // Skip tracking for health or metrics endpoints to avoid noise
    if (req.path === '/metrics' || req.path === '/health') return next();

    const end = httpRequestDuration.startTimer();
    
    res.on('finish', () => {
        const route = req.route ? req.route.path : req.path;
        const labels = {
            method: req.method,
            route,
            status_code: res.statusCode,
        };
        
        httpRequestsTotal.inc(labels);
        end(labels);
    });

    next();
};

const getMetricsEndpoint = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error('Prometheus: Error generating metrics:', err);
        res.status(500).end(err);
    }
};

module.exports = { metricsMiddleware, getMetricsEndpoint };
