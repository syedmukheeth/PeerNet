'use strict';

const Joi = require('joi');

const createPostSchema = Joi.object({
    caption: Joi.string().max(2200).allow('').default(''),
    location: Joi.string().max(100).allow('').default(''),
    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(30)).max(30),
        Joi.string().max(300),
    ),
});

module.exports = { createPostSchema };
