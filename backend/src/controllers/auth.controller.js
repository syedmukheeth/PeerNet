'use strict';

const authService = require('../services/auth.service');

const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const register = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
        res.status(201).json({ success: true, data: { user, accessToken } });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
        res.json({ success: true, data: { user, accessToken } });
    } catch (err) {
        next(err);
    }
};

const refresh = async (req, res, next) => {
    try {
        const oldToken = req.cookies?.refreshToken;
        const { accessToken, refreshToken } = await authService.refresh(oldToken);
        res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
        res.json({ success: true, data: { accessToken } });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        await authService.logout(token);
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout };
