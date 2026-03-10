'use strict';

const ApiError = require('../utils/ApiError');

const requireAdmin = (req, _res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(new ApiError(403, 'Access denied: admins only'));
    }
    next();
};

module.exports = { requireAdmin };
