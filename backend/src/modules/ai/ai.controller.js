'use strict';

const { generateSuggestions } = require('../../config/ai.config');
const ApiError = require('../../utils/ApiError');

const suggestReplies = async (req, res, next) => {
    try {
        const { caption, commentText } = req.body;
        
        // We don't necessarily throw error if caption/commentText are missing, 
        // the AI will just generate generic replies.
        
        const suggestions = await generateSuggestions({ caption, commentText });
        
        res.status(200).json({
            status: 'success',
            data: suggestions
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { suggestReplies };
