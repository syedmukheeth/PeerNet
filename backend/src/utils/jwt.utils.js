'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const signAccessToken = (payload) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    });

const signRefreshToken = (payload) => {
    const jti = uuidv4();
    const token = jwt.sign({ ...payload, jti }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
    return { token, jti };
};

const verifyAccessToken = (token) =>
    jwt.verify(token, process.env.JWT_ACCESS_SECRET);

const verifyRefreshToken = (token) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const ms = (str) => {
    const map = { s: 1, m: 60, h: 3600, d: 86400 };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 2592000; // default 30d
    return parseInt(match[1], 10) * map[match[2]];
};

const refreshTokenTTL = () =>
    ms(process.env.JWT_REFRESH_EXPIRES_IN || '30d');

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    refreshTokenTTL,
};
