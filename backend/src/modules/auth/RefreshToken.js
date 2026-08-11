'use strict';

const mongoose = require('mongoose');

/**
 * Server-side record of every issued refresh token, keyed by the token's jti.
 *
 * Rotation state used to live in Redis with a per-process Map as a fallback.
 * That was wrong twice over: the Map is per-instance, so on Render with more
 * than one replica a token issued by one instance was simply unknown to the
 * next, and an unknown jti was treated as valid. A revoked or replayed refresh
 * token was therefore accepted whenever Redis had restarted, was unavailable,
 * or the request landed on a different instance.
 *
 * Mongo is the source of truth here, matching the project rule that Redis is a
 * cache and never authoritative. The TTL index is safe on this collection: the
 * documents own no external resources, so nothing leaks when Mongo's TTL
 * monitor removes them without an application hook.
 */
const refreshTokenSchema = new mongoose.Schema(
    {
        jti: { type: String, required: true, unique: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        expiresAt: { type: Date, required: true },
        revokedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
