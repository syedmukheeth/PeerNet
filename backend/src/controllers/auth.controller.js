'use strict';

const authService = require('../services/auth.service');

const register = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const refresh = async (req, res, next) => {
    try {
        const oldToken = req.body?.refreshToken;
        const { accessToken, refreshToken } = await authService.refresh(oldToken);
        res.json({ success: true, data: { accessToken, refreshToken } });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.body?.refreshToken;
        await authService.logout(token);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout };
