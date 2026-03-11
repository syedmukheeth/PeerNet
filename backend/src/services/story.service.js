'use strict';

const Story = require('../models/Story');
const Follower = require('../models/Follower');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');

const createStory = async (userId, file) => {
    if (!file) throw new ApiError(400, 'Media file is required');

    const isVideo = file.mimetype.startsWith('video/');
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

const getStoriesFromFollowing = async (userId) => {
    const relations = await Follower.find({ follower: userId }).select('following').lean();
    const ids = relations.map((f) => f.following);
    ids.push(userId);

    const now = new Date();
    return Story.find({ author: { $in: ids }, expiresAt: { $gt: now } })
        .populate('author', 'username avatarUrl')
        .sort({ createdAt: -1 });
};

const deleteStory = async (storyId, userId) => {
    const story = await Story.findById(storyId);
    if (!story) throw new ApiError(404, 'Story not found');
    if (story.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised');
    }
    await deleteFromCloudinary(story.mediaPublicId, story.mediaType === 'video' ? 'video' : 'image');
    await story.deleteOne();
};

const markViewed = async (storyId, userId) => {
    await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } });
};

module.exports = { createStory, getStoriesFromFollowing, deleteStory, markViewed };
