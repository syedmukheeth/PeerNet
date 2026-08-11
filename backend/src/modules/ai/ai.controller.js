'use strict';

const fs = require('fs/promises');
const aiConfig = require('../../config/ai.config');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

/**
 * Handles generating a caption for an uploaded media file.
 */
const generateCaption = async (req, res, next) => {
    const file = req.file;
    try {
        if (!file) {
            throw new ApiError(400, 'Media file is required for AI processing');
        }

        // Gemini takes the bytes. Unlike the Cloudinary path there is nothing
        // else here that removes the temp file, so os.tmpdir() used to grow by
        // one file per request forever.
        const mediaBuffer = await fs.readFile(file.path);
        const caption = await aiConfig.generateCaption(mediaBuffer, file.mimetype);

        res.json({
            success: true,
            data: {
                caption,
                model: 'gemini-2.5-flash'
            }
        });
    } catch (err) {
        next(err);
    } finally {
        if (file?.path) {
            await fs.unlink(file.path).catch((err) => {
                if (err.code !== 'ENOENT') {
                    logger.warn(`Failed to remove AI temp file ${file.path}: ${err.message}`);
                }
            });
        }
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
