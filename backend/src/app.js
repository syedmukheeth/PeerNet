'use strict';

// Load .env for local dev; on Render vars are injected into process.env automatically
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // fallback to cwd/.env (no-op if already loaded)

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

const createApp = () => {
    const app = express();

    // ── Trust proxy (for accurate IP behind Nginx) ──────────────────────────────
    app.set('trust proxy', 1);

    // ── Security headers ─────────────────────────────────────────────────────────
    app.use(helmet());

    // ── CORS ─────────────────────────────────────────────────────────────────────
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
    app.use(
        cors({
            origin: (origin, cb) => {
                // Allow requests with no origin (mobile, curl, server-to-server)
                if (!origin) return cb(null, true);
                // Always allow localhost development
                if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return cb(null, true);
                // Always allow any Vercel preview/prod deployment
                if (origin.endsWith('.vercel.app')) return cb(null, true);
                // Allow explicitly listed origins from env
                if (allowedOrigins.includes(origin)) return cb(null, true);
                cb(new Error(`CORS: origin ${origin} not allowed`));
            },
            credentials: true,
        }),
    );

    // ── Body parsing ─────────────────────────────────────────────────────────────
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // ── NoSQL injection sanitization ─────────────────────────────────────────────
    app.use(mongoSanitize());

    // ── HTTP request logging ─────────────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'test') {
        app.use(
            morgan('combined', {
                stream: { write: (msg) => logger.info(msg.trim()) },
            }),
        );
    }

    // ── Global rate limiter ──────────────────────────────────────────────────────
    app.use(globalLimiter);

    // ── Health check ─────────────────────────────────────────────────────────────
    app.get('/health', (_req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV }));

    // ── API routes ───────────────────────────────────────────────────────────────
    app.use('/api/v1', v1Router);

    // ── 404 handler ──────────────────────────────────────────────────────────────
    app.use((req, _res, next) =>
        next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`)),
    );

    // ── Centralized error handler ─────────────────────────────────────────────────
    app.use(errorHandler);

    return app;
};

module.exports = createApp;
