'use strict';

const User = require('../user/User');
const { getRedisOptional } = require('../../config/redis');
const logger = require('../../config/logger');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    refreshTokenTTL,
} = require('../../utils/jwt.utils');
const ApiError = require('../../utils/ApiError');

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

const login = async ({ email: identifier, password }) => {
    // The identifier could be an actual email or a username
    logger.info(`[AUTH SERVICE] Attempting login for identifier: ${identifier}`);
    const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }]
    }).select('+passwordHash');
    
    if (!user) {
        logger.warn(`[AUTH SERVICE] User not found: ${identifier}`);
        throw new ApiError(401, 'Invalid credentials');
    }

    const match = await user.matchPassword(password);
    if (!match) {
        logger.warn(`[AUTH SERVICE] Password mismatch for: ${identifier}`);
        throw new ApiError(401, 'Invalid credentials');
    }

    logger.info(`[AUTH SERVICE] Successful login for: ${identifier} (${user._id})`);


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

    // Look up user to get their current role (refresh token payload doesn't carry role)
    const user = await User.findById(decoded.userId).select('role').lean();
    if (!user) throw new ApiError(401, 'User no longer exists');

    // Rotate: blacklist old, issue new
    await _setToken(decoded.jti, '1');
    const { token: newRefreshToken, jti: newJti } = signRefreshToken({ userId: decoded.userId });
    await _setToken(newJti, '0');

    const accessToken = signAccessToken({ userId: decoded.userId, role: user.role });
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

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (token) => {
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '');
        let username = usernameBase;
        // Ensure username is unique
        let count = 1;
        while (await User.exists({ username })) {
            username = `${usernameBase}${count}`;
            count++;
        }
        
        // Generate a random secure password for the google user to satisfy the schema
        const randomPassword = require('crypto').randomBytes(16).toString('hex');
        const passwordHash = await User.hashPassword(randomPassword);

        user = await User.create({
            email,
            username,
            fullName: name || username,
            avatarUrl: picture,
            passwordHash,
            isVerified: false
        });
    }

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });
    await _setToken(jti, '0');

    const userObj = user.toJSON();
    // In case passwordHash is still there (though toJSON removes it)
    delete userObj.passwordHash;
    return { user: userObj, accessToken, refreshToken };
};

const guestLogin = async () => {
    // Generate a unique identifier for each guest session to avoid Collisions
    const guestId = require('crypto').randomBytes(4).toString('hex');
    const username = `guest_${guestId}`;
    const email = `guest_${guestId}@peernet.app`;
    const fullName = `Guest ${guestId.toUpperCase()}`;
    
    const randomPassword = require('crypto').randomBytes(16).toString('hex');
    const passwordHash = await User.hashPassword(randomPassword);

    const user = await User.create({
        username,
        email,
        fullName,
        passwordHash,
        bio: 'This is a temporary guest account.'
    });

    // AUTO-FOLLOW ADMINS: Ensure guest sees content immediately
    try {
        const Follower = require('../user/Follower');
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            const isFollowing = await Follower.exists({ follower: user._id, following: admin._id });
            if (!isFollowing) {
                await Follower.create({ follower: user._id, following: admin._id });
                await User.findByIdAndUpdate(user._id, { $inc: { followingCount: 1 } });
                await User.findByIdAndUpdate(admin._id, { $inc: { followersCount: 1 } });
            }
        }
    } catch (err) {
        logger.error('Failed to auto-follow admins for guest', err);
    }

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });
    await _setToken(jti, '0');

    const userObj = user.toJSON();
    delete userObj.passwordHash;
    return { user: userObj, accessToken, refreshToken };
};

module.exports = { register, login, refresh, logout, googleLogin, guestLogin };
