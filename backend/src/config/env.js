'use strict';

const logger = require('./logger');

// Values that look like an unfilled template rather than real configuration.
// backend/.env historically shipped with entries such as JWT_ACCESS_SECRET=[ACCESS_SECRET],
// which silently became the real signing key.
const PLACEHOLDER_PATTERN = /^(\[.*\]|your_.*|change_me.*|<.*>)$/i;

const REQUIRED = [
    ['MONGO_URI', 'MongoDB connection string'],
    ['JWT_ACCESS_SECRET', 'secret used to sign access tokens'],
    ['JWT_REFRESH_SECRET', 'secret used to sign refresh tokens'],
];

const RECOMMENDED = [
    ['REDIS_URL', 'caching, presence and socket fan-out are disabled without it'],
    ['ALLOWED_ORIGINS', 'browser requests from the deployed frontend will be blocked'],
    ['CLOUDINARY_CLOUD_NAME', 'image and video uploads will fail'],
    ['CLOUDINARY_API_KEY', 'image and video uploads will fail'],
    ['CLOUDINARY_API_SECRET', 'image and video uploads will fail'],
    ['GOOGLE_CLIENT_ID', 'Sign in with Google will fail'],
    ['GEMINI_API_KEY', 'AI caption and reply features will fail'],
];

const isMissing = (value) => !value || !value.trim() || PLACEHOLDER_PATTERN.test(value.trim());

/**
 * Validates environment configuration at boot.
 *
 * Missing required values abort startup instead of surfacing later as an
 * opaque 500 on the first login. Missing optional values only degrade a
 * feature, so they are logged and startup continues.
 */
const validateEnv = () => {
    const missingRequired = REQUIRED
        .filter(([key]) => isMissing(process.env[key]))
        .map(([key, why]) => `  - ${key}: ${why}`);

    if (missingRequired.length) {
        const message = [
            'Missing or placeholder environment variables:',
            ...missingRequired,
            'Set them in your .env file, or in the Render dashboard for a deployed service.',
        ].join('\n');
        throw new Error(message);
    }

    RECOMMENDED
        .filter(([key]) => isMissing(process.env[key]))
        .forEach(([key, why]) => logger.warn(`${key} is not set: ${why}`));

    // A broker host that cannot be resolved makes every worker retry and flood
    // the logs. Treat a placeholder as "Kafka disabled" rather than misconfigured.
    if (process.env.KAFKA_BROKER && PLACEHOLDER_PATTERN.test(process.env.KAFKA_BROKER.trim())) {
        logger.warn('KAFKA_BROKER looks like a placeholder, disabling Kafka');
        delete process.env.KAFKA_BROKER;
    }
};

module.exports = { validateEnv };
