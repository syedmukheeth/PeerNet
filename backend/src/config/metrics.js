'use strict';

const promClient = require('prom-client');
const logger = require('./logger');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'peernet-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// ── CUSTOM METRICS ───────────────────────────────────────────────────────────

// 1. HTTP request duration histogram
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  register
});

// 2. Active users counter (can be updated from socket/session)
const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_count',
  help: 'Total number of active socket connections',
  register
});

// 3. Database operation duration
const dbOperationDuration = new promClient.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  register
});

logger.info('Monitoring: Prometheus metrics initialized');

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  activeUsersGauge,
  dbOperationDuration
};
