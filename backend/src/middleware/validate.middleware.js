'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Factory that returns Express middleware validating req.body against a Joi schema.
 */
const validate = (schema) => (req, _res, next) => {
    const { error } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
        return next(new ApiError(422, message));
    }
    next();
};

/**
 * Factory that validates req.query.
 */
const validateQuery = (schema) => (req, _res, next) => {
    const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false,
    });

    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
        return next(new ApiError(422, message));
    }
    req.query = value;
    next();
};

module.exports = { validate, validateQuery };
