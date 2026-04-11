'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { getRequestId } = require('../middleware/tracing.middleware');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || 'logs';
const isProd = process.env.NODE_ENV === 'production';

// ── Formats ──────────────────────────────────────────────────────────────────
const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) => {
        const requestId = getRequestId();
        const trace = requestId ? ` [${requestId}]` : '';
        return stack
            ? `[${timestamp}]${trace} ${level}: ${message}\n${stack}`
            : `[${timestamp}]${trace} ${level}: ${message}`;
    }),
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    printf((info) => {
        const requestId = getRequestId();
        if (requestId) info.requestId = requestId;
        return JSON.stringify(info);
    }),
);

// ── Transports ────────────────────────────────────────────────────────────────
const transports = [
    new winston.transports.Console({
        format: isProd ? prodFormat : devFormat,
    }),
];

// Only add file transports when the log directory is writable (local dev / Docker).
// On Render's ephemeral filesystem the directory may not exist or be read-only,
// so we skip file logging rather than crashing.
let fileTransportsOk = false;
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Quick write-access check
    const testFile = path.join(logDir, '.write_test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    fileTransportsOk = true;
} catch (_) {
    // Filesystem not writable — console-only logging
}

if (fileTransportsOk) {
    transports.push(
        new DailyRotateFile({
            dirname: logDir,
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info',
            format: prodFormat,
        }),
        new DailyRotateFile({
            dirname: logDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: prodFormat,
        }),
    );
}

// ── Logger ────────────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT use Winston's exceptionHandlers / rejectionHandlers with
// file transports.  Winston automatically calls process.exit(1) after writing
// to those handlers — which terminates Render before the server ever starts.
// Uncaught exceptions and unhandled rejections are handled in server.js instead.
const logger = winston.createLogger({
    level: logLevel,
    transports,
    exitOnError: false,   // prevent Winston from exiting the process on transport errors
});

module.exports = logger;
