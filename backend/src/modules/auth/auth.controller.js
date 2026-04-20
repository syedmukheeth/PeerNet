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
        const { email } = req.body;
        console.log(`[AUTH CONTROLLER] Login request received for: ${email}`);
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        console.log(`[AUTH CONTROLLER] Login successful for: ${email}`);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const refresh = async (req, res, next) => {
    try {
        const oldToken = req.cookies.refreshToken || req.body.refreshToken;
        const { accessToken, refreshToken } = await authService.refresh(oldToken);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({ success: true, data: { accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
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
