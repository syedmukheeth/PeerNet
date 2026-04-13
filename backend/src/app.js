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
    // Explicit whitelisting to support process.env.ALLOWED_ORIGINS + Standard Production Slugs
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://peer-net-indol.vercel.app',
        'https://peernet.vercel.app',
        ...(process.env.ALLOWED_ORIGINS || '').split(/[\s,]+/).map((o) => o.trim()).filter(Boolean)
    ];

    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl) or explicitly allowed domains
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
                callback(new Error('CORS Policy violation'));
            }
        },
        methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
        credentials: true,
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
    app.get('*', (req, res, next) => {
        // Skip fallback if request is specifically for API or Has File Extension
        if (req.path.startsWith('/api/v1') || path.extname(req.path)) {
            return next();
        }
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // ── ❌ Error Handling ──────────────────────────────────────────────────────
    app.use((req, res) => {
        logger.warn(`[API-404] ${req.method} ${req.path}`);
        res.status(404).json({ message: 'Requested resource not found' });
    });

    return app;
};

module.exports = createApp;
