'use strict';

const Joi = require('joi');

const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(1).max(60),
    bio: Joi.string().max(150).allow(''),
    website: Joi.string().uri().allow(''),
    isPrivate: Joi.boolean(),
});

module.exports = { updateProfileSchema };
