'use strict';

const ApiError = require('../utils/ApiError');

const requireAdmin = (req, _res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return next(new ApiError(403, 'Access denied: admins only'));
    }
    next();
};

const requireSuperAdmin = (req, _res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return next(new ApiError(403, 'Access denied: Super Admin clearance required'));
    }
    next();
};

module.exports = { requireAdmin, requireSuperAdmin };
