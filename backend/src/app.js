'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('./config/logger');
const { isOriginAllowed } = require('./config/cors');
const { authenticate } = require('./middleware/auth.middleware');
const { requireAdmin } = require('./middleware/admin.middleware');
const { tracingMiddleware } = require('./middleware/tracing.middleware');
const { cleanupOrphanedUpload } = require('./middleware/upload.middleware');
const { metricsMiddleware } = require('./config/metrics');
const notificationController = require('./modules/notification/notification.controller');
const routes = require('./routes/v1');

const { globalLimiter } = require('./middleware/rateLimiter');

/**
 * Guards /metrics. Prometheus scrapes with a bearer token from METRICS_TOKEN;
 * a human hitting it in a browser falls through to the normal admin session
 * check. With neither configured nor supplied the endpoint is closed.
 */
const authenticateMetrics = (req, res, next) => {
    const expected = process.env.METRICS_TOKEN;
    if (expected) {
        const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
        if (supplied && supplied === expected) return next();
    }
    return authenticate(req, res, (err) => (err ? next(err) : requireAdmin(req, res, next)));
};

const createApp = () => {
    const app = express();
    
    // ── 🔧 Production Proxy Setting ────────────────────────────────────────────
    app.set('trust proxy', 1);

    // ── 🌐 CORS ───────────────────────────────────────────────────────────────
    // CORS runs before the rate limiter so that a 429 response still carries the
    // Access-Control-Allow-Origin header. Without it the browser reports an
    // opaque network failure and the client cannot show the real reason.
    if (!process.env.ALLOWED_ORIGINS && process.env.NODE_ENV === 'production') {
        logger.warn('ALLOWED_ORIGINS is not set, only localhost origins will be accepted');
    }

    app.use(cors({
        origin: (origin, callback) => {
            // Requests without an Origin header (curl, mobile apps, same-origin
            // navigation) are not subject to the browser CORS model.
            if (!origin) return callback(null, true);

            if (isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
                // Passing false rather than an Error keeps the response headers
                // intact so the client sees a normal rejection.
                callback(null, false);
            }
        },
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
        credentials: true,
        optionsSuccessStatus: 200 // Some legacy browsers crash on 204
    }));

    // ── 🛡️ Middleware ──────────────────────────────────────────────────────────
    app.use(tracingMiddleware);
    app.use(globalLimiter);
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());
    app.use(cookieParser());

    // Strips $-prefixed and dotted keys so a body like {"email": {"$ne": null}}
    // cannot reach a Mongo query as an operator. The package was already a
    // dependency but was never mounted.
    app.use(mongoSanitize());

    app.use(metricsMiddleware);

    // ── 🩺 Health Check & Monitoring ──────────────────────────────────────────
    // Process, route and traffic telemetry is infrastructure detail, not public
    // information. Requires either the scrape token Prometheus is configured
    // with or an authenticated admin session.
    const { register } = require('./config/metrics');
    app.get('/metrics', authenticateMetrics, async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (err) {
            logger.error('[METRICS] Failed to collect metrics', err);
            res.status(500).end(err.message);
        }
    });

    app.get('/health', (req, res) => res.status(200).json({
        status: 'ok',
        service: 'backend',
        env: process.env.NODE_ENV || 'development',
    }));

    // ── 🔄 Global Sync Bypass (Confirmed Fixed) ───────────────────────────────
    // Mount unread count at top level to ensure high availability regardless of sub-routers.
    const syncPaths = ['/notifications/unread-count', '/api/v1/notifications/unread-count'];
    app.get(syncPaths, authenticate, notificationController.getUnreadCount);

    // ── 📚 API Docs (development only) ────────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
        require('./docs/swagger')(app);
        logger.info('API docs available at /api-docs');
    }

    // ── 🚀 API Routes ─────────────────────────────────────────────────────────
    app.use('/api/v1', routes);

    // ── 📄 Static Files & SPA Fallback ─────────────────────────────────────────
    // Serve frontend static assets from public/ folder
    app.use(express.static(path.join(__dirname, '../public')));

    // SPA Fallback: handle all navigation routes by serving index.html
    if (process.env.NODE_ENV === 'production') {
        app.get('*', (req, res, next) => {
            // Skip API routes, Swagger docs, health check, and file requests
            if (
                req.path.startsWith('/api/v1') ||
                req.path.startsWith('/api-docs') ||
                req.path.startsWith('/health') ||
                path.extname(req.path)
            ) {
                return next();
            }
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    // ── ❌ Error Handling ──────────────────────────────────────────────────────
    // Runs before the handlers below so a request that fails validation after
    // multer has already written to os.tmpdir() does not leave the file behind.
    app.use(cleanupOrphanedUpload);

    app.use((req, res) => {
        logger.warn(`[API-404] ${req.method} ${req.path}`);
        res.status(404).json({ success: false, message: 'Requested resource not found' });
    });

    /**
     * Maps driver-level errors onto the right HTTP status. A malformed id in the
     * URL is a client mistake, but Mongoose reports it as a CastError which used
     * to surface as a 500 and fill the error log.
     */
    const normalizeError = (err) => {
        if (err.statusCode) return { statusCode: err.statusCode, message: err.message };

        if (err.name === 'CastError') {
            return { statusCode: 400, message: `Invalid ${err.path || 'identifier'}` };
        }
        if (err.name === 'ValidationError') {
            return { statusCode: 400, message: err.message };
        }
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'value';
            return { statusCode: 409, message: `That ${field} is already taken` };
        }
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return { statusCode: 401, message: 'Invalid or expired token' };
        }
        if (err.type === 'entity.too.large') {
            return { statusCode: 413, message: 'Upload is too large' };
        }

        return { statusCode: 500, message: err.message || 'Internal Server Error' };
    };

    // Final Global Error Handler
    app.use((err, req, res, _next) => {
        const { statusCode, message } = normalizeError(err);

        if (statusCode === 500) {
            logger.error(`[INTERNAL-ERROR] ${req.method} ${req.path}`, err);
        } else {
            logger.warn(`[API-ERROR] ${statusCode} - ${req.method} ${req.path}: ${message}`);
        }

        res.status(statusCode).json({
            success: false,
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    });

    return app;
};

module.exports = createApp;
