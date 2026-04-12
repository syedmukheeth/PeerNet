'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth.middleware');
const messageController = require('./controllers/message.controller');
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

    // ── 🩺 Diagnostics & Health ───────────────────────────────────────────────
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'chat', environment: 'production' }));

    // ── 🔄 Global Sync Bypass ─────────────────────────────────────────────────
    // Mount unread count at top level to avoid sub-router mounting issues.
    // NOTE: This MUST point to controllers/message.controller.js.
    const chatSyncPaths = ['/conversations/unread-count', '/api/v1/conversations/unread-count'];
    app.get(chatSyncPaths, authenticate, messageController.getUnreadCount);

    // ── 🚀 Microservice Routes ────────────────────────────────────────────────
    app.use('/api/v1', routes);

    // ── ❌ Error Handling ──────────────────────────────────────────────────────
    app.use((req, res) => {
        logger.warn(`[CHAT-404] ${req.method} ${req.path}`);
        res.status(404).json({ message: 'Resource not found in Chat Service' });
    });

    return app;
};

module.exports = createApp;
