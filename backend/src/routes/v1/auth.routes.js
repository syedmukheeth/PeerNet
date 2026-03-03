'use strict';

const router = require('express').Router();
const authController = require('../../controllers/auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authLimiter } = require('../../middleware/rateLimiter');
const { authenticate } = require('../../middleware/auth.middleware');
const { registerSchema, loginSchema } = require('../../validators/auth.validator');

// POST /api/v1/auth/register
router.post('/register', authLimiter, validate(registerSchema), authController.register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/v1/auth/refresh  (reads httpOnly cookie)
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

module.exports = router;
