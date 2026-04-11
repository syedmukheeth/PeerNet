'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Checks if a message body is toxic.
 */
const checkToxicity = async (text) => {
    if (!text || !process.env.GEMINI_API_KEY) return 0;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Classify the following chat message for toxicity (hate speech, harassment, severe insults). 
        Return ONLY a JSON object with a single key "toxicityScore" between 0 and 1. 
        Text: "${text}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return 0;
        
        const json = JSON.parse(jsonMatch[0]);
        return json.toxicityScore || 0;
    } catch (err) {
        logger.error(`AI: Toxicity check failed: ${err.message}`);
        return 0;
    }
};

/**
 * Generates 3 smart replies based on the last few messages in a conversation.
 */
const generateChatSuggestions = async (recentMessages) => {
    if (!recentMessages || recentMessages.length === 0 || !process.env.GEMINI_API_KEY) {
        return ["How's it going?", "Hey!", "Nice to meet you"];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const history = recentMessages
            .map(m => `${m.sender?.username || 'User'}: ${m.body}`)
            .join('\n');
        
        const prompt = `Conversation history:\n${history}\n
        Based on the above chat history, suggest exactly 3 short, natural, and helpful replies for the next message. 
        Each suggestion should be under 8 words. 
        Return ONLY a JSON object with a single key "suggestions" which is an array of 3 strings.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return ["Got it", "Sounds good!", "I'll check it out"];
        
        const json = JSON.parse(jsonMatch[0]);
        return json.suggestions || ["Got it", "Sounds good!", "I'll check it out"];
    } catch (err) {
        logger.error(`AI: Chat suggestion generation failed: ${err.message}`);
        return ["Got it", "Interesting!", "Talk soon"];
    }
};

module.exports = { checkToxicity, generateChatSuggestions };
