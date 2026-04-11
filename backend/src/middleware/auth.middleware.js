'use strict';

const { verifyAccessToken } = require('../utils/jwt.utils');
const ApiError = require('../utils/ApiError');
const User = require('../modules/user/User');

const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Access token missing or malformed');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) throw new ApiError(401, 'User no longer exists');

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new ApiError(401, 'Access token expired'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(new ApiError(401, 'Invalid access token'));
        }
        next(err);
    }
};

module.exports = { authenticate };
