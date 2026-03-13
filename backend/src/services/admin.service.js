'use strict';

const User = require('../models/User');
const Post = require('../models/Post');
const { deleteFromCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');

const getUsers = async ({ limit = 20, skip = 0, search = '' }) => {
    const query = search ? { $text: { $search: search } } : {};
    const [users, total] = await Promise.all([
        User.find(query).select('-passwordHash').sort({ createdAt: -1 }).limit(limit).skip(skip),
        User.countDocuments(query),
    ]);
    return { users, total };
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

const getPlatformStats = async () => {
    const [userCount, postCount] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments(),
    ]);
    return { userCount, postCount };
};

const toggleUserVerification = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    user.isVerified = !user.isVerified;
    await user.save();
    return user;
};

module.exports = { getUsers, deleteUser, deletePost, getPlatformStats, toggleUserVerification };
