'use strict';

const router = require('express').Router();
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authLimiter } = require('../../middleware/rateLimiter');
const { authenticate } = require('../../middleware/auth.middleware');
const { registerSchema, loginSchema } = require('../../validators/auth.validator');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully. Set-Cookie header contains refreshToken.
 */

// POST /api/v1/auth/register
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email or Username
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful. Set-Cookie header contains refreshToken.
 */
// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed. Reads refreshToken from cookie.
 *       401:
 *         description: Invalid or missing refresh token.
 */
// POST /api/v1/auth/refresh (reads httpOnly cookie)
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful. Clears refreshToken cookie.
 */
// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/google
router.post('/google', authLimiter, authController.googleLogin);

// POST /api/v1/auth/guest
router.post('/guest', authLimiter, authController.guestLogin);

module.exports = router;
