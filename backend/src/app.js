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

const createApp = () => {
    const app = express();
    
    // ── 🔧 Production Proxy Setting ────────────────────────────────────────────
    // Required for Render reverse proxy to correctly read client IPs for express-rate-limit
    app.set('trust proxy', 1);

    // ── 🛡️ Middleware ──────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());
    app.use(cookieParser());

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
