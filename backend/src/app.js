'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');
const { tracingMiddleware } = require('./middleware/tracing.middleware');
const { metricsMiddleware, getMetricsEndpoint } = require('./config/metrics.config');
const v1Router = require('./routes/v1');
const ApiError = require('./utils/ApiError');
const notificationController = require('./modules/notification/notification.controller');
const { authenticate } = require('./middleware/auth.middleware');

const createApp = () => {
    const app = express();
    app.set('trust proxy', 1);
    app.set('etag', false);

    app.use(tracingMiddleware);
    app.use(metricsMiddleware);

    // ── Pre-Route Security ───────────────────────────────────────────────────────
    app.use(helmet());
    
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
    app.use(cors({
        origin: (origin, cb) => {
            if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.endsWith('.vercel.app')) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
    }));

    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ extended: true, limit: '100mb' }));
    app.use(cookieParser());
    app.use(mongoSanitize());

    if (process.env.NODE_ENV !== 'test') {
        app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
    }

    // 🚀 NEW: Diagnostic Tracer (Log every sync attempts)
    app.use((req, res, next) => {
        if (req.url.includes('unread-count')) {
            console.log(`[SYNC-TRACE] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers['authorization'] ? 'Present' : 'Missing')}`);
        }
        next();
    });

    // 🚀 GLOBAL BYPASS: Absolute top-level routes to prevent 404s
    // Mounted at root and /api/v1 to handle all proxy variations
    const syncRoutes = ['/notifications/unread-count', '/api/v1/notifications/unread-count'];
    app.get(syncRoutes, authenticate, notificationController.getUnreadCount);
    app.get(['/ping', '/api/v1/ping'], (_req, res) => res.json({ status: 'ok', time: new Date() }));
    app.get(['/health', '/'], (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

    // ── Standard Middlewares ──────────────────────────────────────────────────────
    app.use(globalLimiter);
    app.get('/metrics', getMetricsEndpoint);

    // ── API routes ───────────────────────────────────────────────────────────────
    app.use('/api/v1', v1Router);

    // 404 handler
    app.use((req, _res, next) => {
        console.warn(`[404] ${req.method} ${req.originalUrl}`);
        next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
    });

    app.use(errorHandler);
    return app;
};

module.exports = createApp;
