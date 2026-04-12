'use strict';

const Joi = require('joi');

const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(1).max(60),
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).lowercase(),
    email: Joi.string().email(),
    bio: Joi.string().max(150).allow(''),
    website: Joi.string().uri().allow(''),
    isPrivate: Joi.boolean(),
});

module.exports = { updateProfileSchema };
