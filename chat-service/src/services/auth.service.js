'use strict';

const User = require('../models/User');
const { getRedisOptional } = require('../config/redis');
const logger = require('../config/logger');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    refreshTokenTTL,
} = require('../utils/jwt.utils');
const ApiError = require('../utils/ApiError');

const REFRESH_PREFIX = 'refresh_blacklist:';

// ── In-memory fallback store (used when Redis is unavailable) ─────────────────
// Stores: jti → { value: '0'|'1', expiresAt: Date }
const memStore = new Map();

/** Purge expired entries from memStore to avoid unbounded growth */
const _purgeExpired = () => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
        if (entry.expiresAt <= now) memStore.delete(key);
    }
};

// ── Unified store helpers (Redis-first, mem fallback) ─────────────────────────

const _setToken = async (jti, value) => {
    const ttl = refreshTokenTTL(); // seconds
    const redis = getRedisOptional();
    if (redis) {
        await redis.setEx(`${REFRESH_PREFIX}${jti}`, ttl, value);
    } else {
        _purgeExpired();
        memStore.set(`${REFRESH_PREFIX}${jti}`, {
            value,
            expiresAt: Date.now() + ttl * 1000,
        });
    }
};

const _getToken = async (jti) => {
    const redis = getRedisOptional();
    if (redis) {
        return redis.get(`${REFRESH_PREFIX}${jti}`);
    }
    const entry = memStore.get(`${REFRESH_PREFIX}${jti}`);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        memStore.delete(`${REFRESH_PREFIX}${jti}`);
        return null;
    }
    return entry.value;
};

// ── Auth operations ───────────────────────────────────────────────────────────

const register = async ({ username, email, password, fullName }) => {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
        const field = existing.email === email ? 'Email' : 'Username';
        throw new ApiError(409, `${field} is already taken`);
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ username, email, passwordHash, fullName });

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });

    await _setToken(jti, '0'); // '0' = active (not blacklisted)

    return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const match = await user.matchPassword(password);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });

    await _setToken(jti, '0');

    const userObj = user.toJSON();
    return { user: userObj, accessToken, refreshToken };
};

const refresh = async (oldRefreshToken) => {
    if (!oldRefreshToken) throw new ApiError(401, 'Refresh token missing');

    let decoded;
    try {
        decoded = verifyRefreshToken(oldRefreshToken);
    } catch {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const stored = await _getToken(decoded.jti);
    if (stored === '1') throw new ApiError(401, 'Refresh token has been revoked');

    // Rotate: blacklist old, issue new
    await _setToken(decoded.jti, '1');
    const { token: newRefreshToken, jti: newJti } = signRefreshToken({ userId: decoded.userId });
    await _setToken(newJti, '0');

    const accessToken = signAccessToken({ userId: decoded.userId, role: decoded.role });
    return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (refreshToken) => {
    if (!refreshToken) return;
    try {
        const decoded = verifyRefreshToken(refreshToken);
        await _setToken(decoded.jti, '1');
    } catch {
        // Ignore invalid tokens on logout
    }
};

module.exports = { register, login, refresh, logout };
