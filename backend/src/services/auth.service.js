'use strict';

const User = require('../models/User');
const { getRedis } = require('../config/redis');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    refreshTokenTTL,
} = require('../utils/jwt.utils');
const ApiError = require('../utils/ApiError');

const REFRESH_BLACKLIST_PREFIX = 'refresh_blacklist:';

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

    await _storeRefreshToken(jti);

    return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const match = await user.matchPassword(password);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });

    await _storeRefreshToken(jti);

    // Strip passwordHash before returning
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

    const redis = getRedis();
    const blacklisted = await redis.get(`${REFRESH_BLACKLIST_PREFIX}${decoded.jti}`);
    if (blacklisted) throw new ApiError(401, 'Refresh token has been revoked');

    // Rotate: blacklist old, issue new
    await _blacklistRefreshToken(decoded.jti);
    const { token: newRefreshToken, jti: newJti } = signRefreshToken({ userId: decoded.userId });
    await _storeRefreshToken(newJti);

    const accessToken = signAccessToken({ userId: decoded.userId, role: decoded.role });
    return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (refreshToken) => {
    if (!refreshToken) return;
    try {
        const decoded = verifyRefreshToken(refreshToken);
        await _blacklistRefreshToken(decoded.jti);
    } catch {
        // Ignore invalid tokens on logout
    }
};

// ── Private helpers ──────────────────────────────────────────────────────────

const _storeRefreshToken = async (jti) => {
    const redis = getRedis();
    const ttl = refreshTokenTTL();
    await redis.setEx(`${REFRESH_BLACKLIST_PREFIX}${jti}`, ttl, '0');
};

const _blacklistRefreshToken = async (jti) => {
    const redis = getRedis();
    const ttl = refreshTokenTTL();
    await redis.setEx(`${REFRESH_BLACKLIST_PREFIX}${jti}`, ttl, '1');
};

module.exports = { register, login, refresh, logout };
