const feedbackService = require('./feedback.service');

exports.createFeedback = async (req, res) => {
    try {
        const { type, content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Feedback content is required' });
        }

        const feedback = await feedbackService.saveFeedback({
            userId: req.user._id,
            type: type || 'other',
            content,
            path: req.headers.referer || 'unknown'
        });

        res.status(201).json({
            status: 'success',
            message: 'Feedback received successfully',
            data: feedback
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
