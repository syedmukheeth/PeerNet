'use strict';

const Story = require('./Story');
const Follower = require('../user/Follower');
const userService = require('../user/user.service');
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

    // upload.middleware resolves generic octet-stream uploads to a real type
    // before they get here, so the mimetype can be trusted.
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
        content: data.content || '',
        fontFamily: data.fontFamily || 'Modern',
        textAlign: data.textAlign || 'center',
        isBold: data.isBold === 'true' || data.isBold === true,
        textColor: data.textColor || '#ffffff'
    });
};

const getStoriesFromFollowing = async (userId) => {
    const follows = await Follower.find({ follower: userId }).select('following').lean();
    const followingIds = follows.map(f => f.following);
    // Include own stories
    followingIds.push(userId);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
        author: { $in: followingIds },
        createdAt: { $gte: cutoff },
    })
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .lean();

    // Map viewedByMe based on the current user
    return stories.map(s => ({
        ...s,
        viewedByMe: s.viewers?.some(v => v.toString() === userId.toString()) || false
    }));
};

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
    // viewers is an unbounded embedded array. Without an existence and
    // visibility check any user could append themselves to any story by
    // guessing an id, inflating the author's viewer list indefinitely.
    const story = await Story.findById(storyId).select('author').lean();
    if (!story) throw new ApiError(404, 'Story not found');

    if (story.author.toString() !== userId.toString()) {
        await userService.assertCanViewContent(story.author, userId);
    }

    await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } });
};

module.exports = { createStory, getStoriesFromFollowing, deleteStory, markViewed };
