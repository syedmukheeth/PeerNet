'use strict';

const Story = require('./Story');
const Follower = require('../user/Follower');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');

const createStory = async (userId, file, data = {}) => {
    // 1. Text Story Path
    if (data.mediaType === 'text') {
        if (!data.content) throw new ApiError(400, 'Story content is required');
        return Story.create({
            author: userId,
            mediaType: 'text',
            content: data.content,
            backgroundColor: data.backgroundColor || '#000000'
        });
    }

    // 2. Media Story Path
    if (!file) throw new ApiError(400, 'Media file is required');

    const isVideo = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    const { secure_url, public_id } = await uploadToCloudinary(file.path, {
        folder: 'peernet/stories',
        resource_type: isVideo ? 'video' : 'image',
    });

    return Story.create({
        author: userId,
        mediaUrl: secure_url,
        mediaPublicId: public_id,
        mediaType: isVideo ? 'video' : 'image',
    });
};

// ... getStories and others ...

const deleteStory = async (storyId, userId) => {
    const story = await Story.findById(storyId);
    if (!story) throw new ApiError(404, 'Story not found');
    if (story.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised');
    }
    
    // Only delete from Cloudinary if it's NOT a text story
    if (story.mediaType !== 'text') {
        await deleteFromCloudinary(story.mediaPublicId, story.mediaType === 'video' ? 'video' : 'image');
    }
    
    await story.deleteOne();
};

const markViewed = async (storyId, userId) => {
    await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } });
};

module.exports = { createStory, getStoriesFromFollowing, deleteStory, markViewed };
