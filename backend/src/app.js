'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth.middleware');
const notificationController = require('./modules/notification/notification.controller');
const routes = require('./routes/v1');

const createApp = () => {
    const app = express();

    // ── 🛡️ Middleware ──────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());

    // ── 🌐 CORS ───────────────────────────────────────────────────────────────
    const allowedOrigins = [
        'https://peer-net-indol.vercel.app',
        'https://peernet.vercel.app',
        ...(process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
    ];

    app.use(cors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
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

    // ── ❌ Error Handling ──────────────────────────────────────────────────────
    app.use((req, res) => {
        logger.warn(`[API-404] ${req.method} ${req.path}`);
        res.status(404).json({ message: 'Requested resource not found' });
    });

    return app;
};

module.exports = createApp;
