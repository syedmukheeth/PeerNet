'use strict';

const feedbackService = require('./feedback.service');

/**
 * Errors go to next(), not to a local 500 with err.message in the body: the
 * previous version leaked internal error text to the client and, because it
 * never called next(), nothing was ever logged. The response envelope also
 * matches the rest of the API now ({ success, data }) rather than the
 * { status: 'success' } shape used only here.
 */
exports.createFeedback = async (req, res, next) => {
    try {
        const { type, content } = req.body;

        const feedback = await feedbackService.saveFeedback({
            userId: req.user._id,
            type: type || 'other',
            content,
            path: req.headers.referer || 'unknown'
        });

        res.status(201).json({ success: true, data: feedback });
    } catch (err) {
        next(err);
    }
};
