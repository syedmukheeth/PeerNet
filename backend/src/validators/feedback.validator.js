'use strict';

const Joi = require('joi');

const createFeedbackSchema = Joi.object({
    type: Joi.string().valid('bug', 'feature', 'other').default('other'),
    content: Joi.string().trim().min(1).max(2000).required(),
});

module.exports = { createFeedbackSchema };
