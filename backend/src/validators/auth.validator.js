'use strict';

const Joi = require('joi');

const passwordRule = Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .message(
        'Password must be 8–72 chars and include uppercase, lowercase, number and special char',
    );

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: passwordRule.required(),
    fullName: Joi.string().min(1).max(60).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().required(), // Can be email or username
    password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
