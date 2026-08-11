'use strict';

const Joi = require('joi');

// validate.middleware runs with allowUnknown: false, so anything the service
// reads has to be declared here. mediaType and backgroundColor were missing,
// which made text posts impossible: the model and the service supported them
// but the request was rejected with "mediaType is not allowed" before it got
// that far.
const createPostSchema = Joi.object({
    caption: Joi.string().max(2200).allow('').default(''),
    location: Joi.string().max(100).allow('').default(''),
    mediaType: Joi.string().valid('image', 'video', 'text').default('image'),
    backgroundColor: Joi.string()
        .pattern(/^#[0-9a-fA-F]{6}$/)
        .message('backgroundColor must be a hex colour such as #1A1A1A')
        .allow('', null),
    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(30)).max(30),
        Joi.string().max(300),
    ),
});

const updatePostSchema = Joi.object({
    caption: Joi.string().max(2200).allow('').required(),
});

module.exports = { createPostSchema, updatePostSchema };
