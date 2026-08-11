'use strict';

const router = require('express').Router();
const Joi = require('joi');
const reportService = require('./report.service');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { writeLimiter } = require('../../middleware/rateLimiter');

const createReportSchema = Joi.object({
    targetType: Joi.string().valid('User', 'Post', 'Comment', 'Story').required(),
    targetId: Joi.string().hex().length(24).required(),
    reason: Joi.string()
        .valid('spam', 'harassment', 'inappropriate', 'violence', 'other')
        .required(),
    description: Joi.string().trim().max(1000).allow(''),
});

// POST /api/v1/reports
router.post(
    '/',
    authenticate,
    writeLimiter,
    validate(createReportSchema),
    async (req, res, next) => {
        try {
            const report = await reportService.createReport(req.user._id, req.body);
            res.status(201).json({ success: true, data: report });
        } catch (err) { next(err); }
    },
);

module.exports = router;
