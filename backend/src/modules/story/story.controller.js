'use strict';

const storyService = require('./story.service');

const createStory = async (req, res, next) => {
    try {
        const story = await storyService.createStory(req.user._id, req.file);
        res.status(201).json({ success: true, data: story });
    } catch (err) { next(err); }
};

const getStories = async (req, res, next) => {
    try {
        const stories = await storyService.getStoriesFromFollowing(req.user._id);
        res.json({ success: true, data: stories });
    } catch (err) { next(err); }
};

const deleteStory = async (req, res, next) => {
    try {
        await storyService.deleteStory(req.params.id, req.user._id);
        res.json({ success: true, message: 'Story deleted' });
    } catch (err) { next(err); }
};

const viewStory = async (req, res, next) => {
    try {
        await storyService.markViewed(req.params.id, req.user._id);
        res.json({ success: true });
    } catch (err) { next(err); }
};

module.exports = { createStory, getStories, deleteStory, viewStory };
