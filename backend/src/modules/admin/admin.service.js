'use strict';

const User = require('../user/User');
const Post = require('../post/Post');
const Story = require('../story/Story');
const Dscroll = require('../dscroll/Dscroll');
const Feedback = require('../feedback/Feedback');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');

const getUsers = async ({ limit = 20, skip = 0, search = '' }) => {
    let query = {};
    if (search) {
        query = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ]
        };
    }
    
    const [users, total] = await Promise.all([
        User.find(query).select('-passwordHash').sort({ createdAt: -1 }).limit(limit).skip(skip),
        User.countDocuments(query),
    ]);
    return { users, total };
};

const getPosts = async ({ limit = 20, skip = 0, type = 'all' }) => {
    const postQuery = type === 'video' ? { mediaType: 'video' } : (type === 'image' ? { mediaType: 'image' } : {});
    
    const [posts, total] = await Promise.all([
        Post.find(postQuery).populate('author', 'username avatarUrl').sort({ createdAt: -1 }).limit(limit).skip(skip),
        Post.countDocuments(postQuery),
    ]);
    return { posts, total };
};

const getFeedback = async ({ limit = 20, skip = 0 }) => {
    const [items, total] = await Promise.all([
        Feedback.find().populate('userId', 'username email').sort({ createdAt: -1 }).limit(limit).skip(skip),
        Feedback.countDocuments(),
    ]);
    return { items, total };
};

const deleteUser = async (userId) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    // Cleanup assets
    if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);
};

const deletePost = async (postId) => {
    const post = await Post.findByIdAndDelete(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    if (post.mediaPublicId) {
        await deleteFromCloudinary(post.mediaPublicId, post.mediaType === 'video' ? 'video' : 'image');
    }
};

const deleteStory = async (storyId) => {
    const story = await Story.findByIdAndDelete(storyId);
    if (!story) throw new ApiError(404, 'Story not found');
    if (story.mediaPublicId) await deleteFromCloudinary(story.mediaPublicId);
};

const getPlatformStats = async () => {
    const [userCount, postCount, storyCount, dscrollCount, feedbackCount] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments({ mediaType: { $ne: 'video' } }),
        Story.countDocuments(),
        Dscroll.countDocuments() || Post.countDocuments({ mediaType: 'video' }),
        Feedback.countDocuments({ status: 'open' })
    ]);
    
    const calculatedBandwidth = (userCount * 0.15) + (postCount * 1.2) + (dscrollCount * 8.5) + (storyCount * 3.2);
    const bandwidthUsage = calculatedBandwidth > 1024 
        ? (calculatedBandwidth / 1024).toFixed(2) + ' TB' 
        : calculatedBandwidth.toFixed(2) + ' GB';
        
    return { 
        userCount, 
        postCount, 
        storyCount, 
        dscrollCount,
        openFeedback: feedbackCount,
        bandwidthUsage
    };
};

const toggleUserVerification = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    user.isVerified = !user.isVerified;
    await user.save();
    return user;
};

module.exports = { 
    getUsers, 
    getPosts,
    getFeedback,
    deleteUser, 
    deletePost, 
    deleteStory,
    getPlatformStats, 
    toggleUserVerification 
};
