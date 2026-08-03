'use strict';

const authService = require('./auth.service');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use 'none' only with HTTPS (Production)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches refresh token expiry)
};

const register = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

// The body token wins over the cookie, deliberately.
//
// The refreshToken cookie is ambient browser state: every login, register,
// google and guest response overwrites it, so it always names whichever account
// authenticated most recently. A client holding several sessions (the account
// switcher) sends the token for the account it actually wants in the body, and
// that explicit assertion has to beat the ambient one. With the old
// cookie-first order, switching to any account whose 1h access token had
// expired refreshed the WRONG session and silently bounced the user back to the
// most recent account.
//
// Cookie-only callers send no body token and are unaffected.
const refresh = async (req, res, next) => {
    try {
        const oldToken = req.body.refreshToken || req.cookies.refreshToken;
        const { accessToken, refreshToken } = await authService.refresh(oldToken);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({ success: true, data: { accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        // Same reasoning as refresh, in reverse: reading only the cookie meant
        // logging out of one account revoked whichever session happened to own
        // the cookie, which is how stored accounts ended up dead in the list.
        const token = req.body.refreshToken || req.cookies.refreshToken;
        await authService.logout(token);
        res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Google token required' });
        const { user, accessToken, refreshToken } = await authService.googleLogin(token);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const guestLogin = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.guestLogin();
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout, googleLogin, guestLogin };
