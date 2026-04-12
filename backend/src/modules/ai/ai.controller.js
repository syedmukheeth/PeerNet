'use strict';

const aiConfig = require('../../config/ai.config');
const ApiError = require('../../utils/ApiError');

/**
 * Handles generating a caption for an uploaded media file.
 */
const generateCaption = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            throw new ApiError(400, 'Media file is required for AI processing');
        }

        // Gemini 1.5 Flash supports images and videos
        const caption = await aiConfig.generateCaption(file.path, file.mimetype);

        res.json({
            success: true,
            data: {
                caption,
                model: 'gemini-2.5-flash'
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Handles optimizing an existing text caption.
 */
const optimizeCaption = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length === 0) {
            throw new ApiError(400, 'Text content is required for optimization');
        }

        const optimized = await aiConfig.optimizeCaption(text);

        res.json({
            success: true,
            data: {
                optimized,
                model: 'gemini-2.5-flash'
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    generateCaption,
    optimizeCaption
};
