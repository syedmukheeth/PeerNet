'use strict';

const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User');

const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, proceed as unauthenticated
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (user) {
            req.user = user;
        }
        next();
    } catch (err) {
        // If token is expired or invalid but optional, just proceed anonymously
        next();
    }
};

module.exports = { optionalAuth };
