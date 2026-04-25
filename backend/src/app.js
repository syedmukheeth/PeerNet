'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth.middleware');
const notificationController = require('./modules/notification/notification.controller');
const routes = require('./routes/v1');

const { globalLimiter } = require('./middleware/rateLimiter');

// ... imports ...
const createApp = () => {
    const app = express();
    
    // ── 🔧 Production Proxy Setting ────────────────────────────────────────────
    app.set('trust proxy', 1);

    // ── 🛡️ Middleware ──────────────────────────────────────────────────────────
    app.use(globalLimiter);
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());
    app.use(cookieParser());

    // ── 🌐 CORS ───────────────────────────────────────────────────────────────
    // Robust whitelisting for local, production, and Vercel preview branches
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://peer-net-indol.vercel.app',
        'https://peernet.vercel.app',
        /\.vercel\.app$/ // Matches any Vercel deployment/preview subdomain
    ];

    app.use(cors({
        origin: (origin, callback) => {
            // 1. Allow non-browser requests (mobile, etc.)
            if (!origin) return callback(null, true);
            
            // 2. Check against explicit list or Regex
            const isAllowed = allowedOrigins.some(pattern => {
                if (pattern instanceof RegExp) return pattern.test(origin);
                return pattern === origin;
            });

            if (isAllowed) {
                callback(null, true);
            } else {
                logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
                // Instead of throwing an Error (which strips headers), we pass false
                callback(null, false);
            }
        },
        methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
        credentials: true,
        optionsSuccessStatus: 200 // Some legacy browsers crash on 204
    }));

    // ── 🩺 Health Check ───────────────────────────────────────────────────────
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'backend', env: 'production' }));

    // ── 🔄 Global Sync Bypass (Confirmed Fixed) ───────────────────────────────
    // Mount unread count at top level to ensure high availability regardless of sub-routers.
    const syncPaths = ['/notifications/unread-count', '/api/v1/notifications/unread-count'];
    app.get(syncPaths, authenticate, notificationController.getUnreadCount);

    // ── 🚀 API Routes ─────────────────────────────────────────────────────────
    app.use('/api/v1', routes);

    // ── 📄 Static Files & SPA Fallback ─────────────────────────────────────────
    // Serve frontend static assets from public/ folder
    app.use(express.static(path.join(__dirname, '../public')));

    // SPA Fallback: handle all navigation routes by serving index.html
    if (process.env.NODE_ENV === 'production') {
        app.get('*', (req, res, next) => {
            // Skip fallback if request is specifically for API or Has File Extension
            if (req.path.startsWith('/api/v1') || path.extname(req.path)) {
                return next();
            }
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    // ── ❌ Error Handling ──────────────────────────────────────────────────────
    app.use((req, res) => {
        logger.warn(`[API-404] ${req.method} ${req.path}`);
        res.status(404).json({ message: 'Requested resource not found' });
    });

    // Final Global Error Handler
    app.use((err, req, res, _next) => {
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        
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
