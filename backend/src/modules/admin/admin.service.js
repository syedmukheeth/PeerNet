'use strict';

const User = require('../user/User');
const Post = require('../post/Post');
const Story = require('../story/Story');
const Dscroll = require('../dscroll/Dscroll');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const ApiError = require('../../utils/ApiError');

const getUsers = async ({ limit = 20, skip = 0, search = '' }) => {
    const query = search ? { $text: { $search: search } } : {};
    const [users, total] = await Promise.all([
        User.find(query).select('-passwordHash').sort({ createdAt: -1 }).limit(limit).skip(skip),
        User.countDocuments(query),
    ]);
    return { users, total };
};

const getPosts = async ({ limit = 20, skip = 0 }) => {
    const [posts, total] = await Promise.all([
        Post.find().populate('author', 'username avatarUrl').sort({ createdAt: -1 }).limit(limit).skip(skip),
        Post.countDocuments(),
    ]);
    return { posts, total };
};

const deleteUser = async (userId) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);
};

const deletePost = async (postId) => {
    const post = await Post.findByIdAndDelete(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    await deleteFromCloudinary(post.mediaPublicId, post.mediaType === 'video' ? 'video' : 'image');
};

const deleteStory = async (storyId) => {
    const story = await Story.findByIdAndDelete(storyId);
    if (!story) throw new ApiError(404, 'Story not found');
    if (story.mediaPublicId) await deleteFromCloudinary(story.mediaPublicId);
};

const getPlatformStats = async () => {
    const [userCount, postCount, storyCount, dscrollCount] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments({ mediaType: { $ne: 'video' } }),
        Story.countDocuments(),
        Dscroll.countDocuments() || Post.countDocuments({ mediaType: 'video' }),
    ]);
    return { userCount, postCount, storyCount, dscrollCount };
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
    deleteUser, 
    deletePost, 
    deleteStory,
    getPlatformStats, 
    toggleUserVerification 
};
