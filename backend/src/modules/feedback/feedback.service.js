const Feedback = require('./Feedback');

/**
 * Save user feedback to the database
 */
exports.saveFeedback = async (data) => {
    return await Feedback.create(data);
};
