'use strict';

const Joi = require('joi');

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Story creation previously had no validation middleware at all: data.content
 * went straight into an unbounded schema field, and backgroundColor, textColor
 * and fontFamily were whatever the client sent.
 *
 * The media path sends multipart form data, so every value arrives as a string
 * and the booleans have to be coerced.
 */
const createStorySchema = Joi.object({
    mediaType: Joi.string().valid('image', 'video', 'text').default('image'),
    content: Joi.string().trim().max(1000).allow('').when('mediaType', {
        is: 'text',
        then: Joi.string().trim().min(1).max(1000).required(),
    }),
    backgroundColor: Joi.string().pattern(HEX_COLOUR)
        .message('backgroundColor must be a hex colour such as #1A1A1A'),
    textColor: Joi.string().pattern(HEX_COLOUR)
        .message('textColor must be a hex colour such as #FFFFFF'),
    // Must match FONT_FAMILIES in frontend/src/components/CreateStoryModal.jsx.
    fontFamily: Joi.string().valid('Modern', 'Classic', 'Neon', 'Strong'),
    textAlign: Joi.string().valid('left', 'center', 'right'),
    isBold: Joi.boolean(),
});

module.exports = { createStorySchema };
