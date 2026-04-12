'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const logger = require('./logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates an auto-caption for an image or video.
 */
const generateCaption = async (filePath, mimeType) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imageBuffer = fs.readFileSync(filePath);
        
        const prompt = "Describe this media in a short, engaging social media caption (max 20 words). Do not use hashtags.";
        
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType
                }
            }
        ]);
        
        const response = await result.response;
        return response.text().trim();
    } catch (err) {
        logger.error(`AI: Caption generation failed: ${err.message}`);
        return ''; // Fallback to empty caption
    }
};

/**
 * Checks if a string contains toxic, hateful, or harassing content.
 * Returns a score between 0 (safe) and 1 (toxic).
 */
const checkToxicity = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Classify the following text for toxicity (hate speech, harassment, severe insults). 
        Return ONLY a JSON object with a single key "toxicityScore" between 0 and 1. 
        Text: "${text}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        // Robust JSON extraction
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            logger.warn(`AI: No JSON found in toxicity response: ${textResponse}`);
            return 0;
        }
        
        const json = JSON.parse(jsonMatch[0]);
        return json.toxicityScore || 0;
    } catch (err) {
        logger.error(`AI: Toxicity check failed: ${err.message}`);
        return 0; // Default to safe if API fails
    }
};

/**
 * Generates 3 short context-aware reply suggestions based on post caption and/or parent comment.
 */
const generateSuggestions = async ({ caption, commentText }) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const context = `Post caption: "${caption || 'No caption'}"` + 
                        (commentText ? `\nReplying to comment: "${commentText}"` : '');
        
        const prompt = `${context}
        Based on the above context, suggest exactly 3 short, engaging, and friendly social media replies. 
        Each reply should be no more than 10 words. 
        Return ONLY a JSON object with a single key "suggestions" which is an array of 3 strings.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return ["Nice post!", "Love this", "Great view"];
        
        const json = JSON.parse(jsonMatch[0]);
        return json.suggestions || ["Nice post!", "Love this", "Great view"];
    } catch (err) {
        logger.error(`AI: Suggestion generation failed: ${err.message}`);
        return ["Nice post!", "Love this", "Great view"];
    }
};

/**
 * Optimizes an existing caption for better engagement.
 */
const optimizeCaption = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Rewrite the following social media caption to be more engaging, catchy, and professional (max 30 words). Keep the original intent and do not use generic hashtags unless they add real value.
        Caption: "${text}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (err) {
        logger.error(`AI: Caption optimization failed: ${err.message}`);
        return text; // Fallback to original text
    }
};

module.exports = { generateCaption, checkToxicity, generateSuggestions, optimizeCaption };
