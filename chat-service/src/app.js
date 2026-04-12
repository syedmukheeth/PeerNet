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
const v1Router = require('./routes/v1');
const ApiError = require('./utils/ApiError');
const messageController = require('./controllers/message.controller');
const { authenticate } = require('./middleware/auth.middleware');

const createApp = () => {
    const app = express();
    app.set('trust proxy', 1);

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
            console.log(`[CHAT-SYNC-TRACE] ${req.method} ${req.url}`);
        }
        next();
    });

    // 🚀 GLOBAL BYPASS: Absolute top-level routes to prevent 404s
    const chatSyncPaths = ['/conversations/unread-count', '/api/v1/conversations/unread-count'];
    app.get(chatSyncPaths, authenticate, messageController.getUnreadCount);
    app.get(['/health', '/', '/ping'], (_req, res) => res.json({ status: 'ok', service: 'chat' }));

    app.use(globalLimiter);

    // ── API routes ───────────────────────────────────────────────────────────────
    app.use('/api/v1', v1Router);

    app.use((req, _res, next) =>
        next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`)),
    );

    app.use(errorHandler);
    return app;
};

module.exports = createApp;
