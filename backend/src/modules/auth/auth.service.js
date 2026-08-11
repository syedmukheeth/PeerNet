'use strict';

const User = require('../user/User');
const RefreshToken = require('./RefreshToken');
const logger = require('../../config/logger');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    refreshTokenTTL,
} = require('../../utils/jwt.utils');
const ApiError = require('../../utils/ApiError');
const { GUEST_TTL_MS } = require('../user/guest.constants');

// ── Refresh token store (Mongo-backed, see RefreshToken.js) ───────────────────

/** Records a newly issued refresh token so it can later be rotated or revoked. */
const _issueToken = async (jti, userId) => {
    await RefreshToken.create({
        jti,
        user: userId,
        expiresAt: new Date(Date.now() + refreshTokenTTL() * 1000),
    });
};

/**
 * Atomically consumes a refresh token, returning true only if this call is the
 * one that revoked it.
 *
 * findOneAndUpdate matching on revokedAt: null is what makes rotation safe:
 * two concurrent refreshes with the same token both reach the database, exactly
 * one matches, and the loser is told the token was already used. The previous
 * read-then-write version let both through.
 */
const _consumeToken = async (jti) => {
    const consumed = await RefreshToken.findOneAndUpdate(
        { jti, revokedAt: null },
        { revokedAt: new Date() },
        { new: true },
    );
    return consumed;
};

/** Revokes every outstanding refresh token for a user. */
const _revokeAllForUser = async (userId) => {
    await RefreshToken.updateMany(
        { user: userId, revokedAt: null },
        { revokedAt: new Date() },
    );
};

// ── Auth operations ───────────────────────────────────────────────────────────

const register = async ({ username, email, password, fullName }) => {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
        const field = existing.email === email ? 'Email' : 'Username';
        throw new ApiError(409, `${field} is already taken`);
    }

    const passwordHash = await User.hashPassword(password);

    // The check above is advisory: two concurrent signups for the same address
    // both pass it. The unique index is the real guard, so its error is caught
    // and turned into the same message rather than a generic 409 from the
    // global handler.
    let user;
    try {
        user = await User.create({ username, email, passwordHash, fullName });
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] === 'email' ? 'Email' : 'Username';
            throw new ApiError(409, `${field} is already taken`);
        }
        throw err;
    }

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });

    await _issueToken(jti, user._id);

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

    if (user.status === 'banned' || user.status === 'suspended') {
        logger.warn(`[AUTH SERVICE] Blocked login for ${user.status} account: ${identifier}`);
        throw new ApiError(403, 'This account is not active');
    }

    logger.info(`[AUTH SERVICE] Successful login for: ${identifier} (${user._id})`);


    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });

    await _issueToken(jti, user._id);

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

    // Fails closed. An unknown jti means the token was already rotated, was
    // revoked at logout, or was never issued by this deployment, and all three
    // must be refused. The old code only rejected an explicit '1' and treated
    // "not found" as valid.
    const consumed = await _consumeToken(decoded.jti);
    if (!consumed) {
        // A token presented twice is either a replay or a stolen token racing
        // the legitimate client. Neither is recoverable from here, so every
        // session for the user is dropped.
        logger.warn(`Refresh token reuse detected for user ${decoded.userId}`);
        await _revokeAllForUser(decoded.userId);
        throw new ApiError(401, 'Refresh token has been revoked');
    }

    // Look up user to get their current role (refresh token payload doesn't carry role)
    const user = await User.findById(decoded.userId).select('role status').lean();
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.status === 'banned' || user.status === 'suspended') {
        throw new ApiError(403, 'This account is not active');
    }

    const { token: newRefreshToken, jti: newJti } = signRefreshToken({ userId: decoded.userId });
    await _issueToken(newJti, decoded.userId);

    const accessToken = signAccessToken({ userId: decoded.userId, role: user.role });
    return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (refreshToken) => {
    if (!refreshToken) return;
    try {
        const decoded = verifyRefreshToken(refreshToken);
        await _consumeToken(decoded.jti);
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
    const { email, name, picture, email_verified: emailVerified } = payload;

    // An unverified Google address must never be trusted to identify an account.
    // The lookup below matches on email alone, so accepting one would hand over
    // any PeerNet account whose email an attacker can claim but not prove.
    if (!emailVerified) {
        throw new ApiError(401, 'Google account email is not verified');
    }

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
    await _issueToken(jti, user._id);

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
        bio: 'This is a temporary guest account.',
        // Guest sessions are temporary. jobs/guestCleanup.job.js sweeps these
        // hourly and cascades the delete through everything they created.
        isGuest: true,
        expiresAt: new Date(Date.now() + GUEST_TTL_MS),
    });

    // AUTO-FOLLOW ADMINS: Ensure guest sees content immediately
    try {
        const Follower = require('../user/Follower');
        const admins = await User.find({ role: 'admin' }).select('_id').lean();
        if (admins.length) {
            // The account is new, so there is nothing to check for existing
            // follows. ordered: false means one duplicate cannot abort the rest.
            const adminIds = admins.map((a) => a._id);
            await Follower.insertMany(
                adminIds.map((id) => ({ follower: user._id, following: id })),
                { ordered: false },
            );
            await User.updateOne({ _id: user._id }, { $inc: { followingCount: adminIds.length } });
            await User.updateMany({ _id: { $in: adminIds } }, { $inc: { followersCount: 1 } });
        }
    } catch (err) {
        logger.error('Failed to auto-follow admins for guest', err);
    }

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const { token: refreshToken, jti } = signRefreshToken({ userId: user._id });
    await _issueToken(jti, user._id);

    const userObj = user.toJSON();
    delete userObj.passwordHash;
    return { user: userObj, accessToken, refreshToken };
};

module.exports = { register, login, refresh, logout, googleLogin, guestLogin };
