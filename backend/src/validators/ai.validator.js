'use strict';

const Joi = require('joi');

// The endpoint forwards this text to a paid model, so its length is a direct
// cost. It previously accepted a body of any size.
const optimizeCaptionSchema = Joi.object({
    text: Joi.string().trim().min(1).max(2200).required(),
});

module.exports = { optimizeCaptionSchema };
