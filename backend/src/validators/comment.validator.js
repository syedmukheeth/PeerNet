'use strict';

const Joi = require('joi');

const addCommentSchema = Joi.object({
    body: Joi.string().min(1).max(300).required(),
    parentComment: Joi.string().hex().length(24).allow(null).default(null),
});

module.exports = { addCommentSchema };
