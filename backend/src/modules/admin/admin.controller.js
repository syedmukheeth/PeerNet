'use strict';

const adminService = require('./admin.service');
const catchAsync = require('../../utils/catchAsync');

const getUsers = catchAsync(async (req, res) => {
    const { limit, skip, search } = req.query;
    const data = await adminService.getUsers({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0, 
        search 
    });
    res.json({ success: true, ...data });
});

const getPosts = catchAsync(async (req, res) => {
    const { limit, skip } = req.query;
    const data = await adminService.getPosts({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0 
    });
    res.json({ success: true, ...data });
});

const deleteUser = catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.userId || req.params.id);
    res.json({ success: true, message: 'User deleted' });
});

const deletePost = catchAsync(async (req, res) => {
    await adminService.deletePost(req.params.postId || req.params.id);
    res.json({ success: true, message: 'Post deleted' });
});

const deleteStory = catchAsync(async (req, res) => {
    await adminService.deleteStory(req.params.storyId);
    res.json({ success: true, message: 'Story deleted' });
});

const getStats = catchAsync(async (req, res) => {
    const stats = await adminService.getPlatformStats();
    res.json({ success: true, data: stats });
});

const verifyUser = catchAsync(async (req, res) => {
    const user = await adminService.toggleUserVerification(req.params.userId || req.params.id);
    res.json({ success: true, data: user, message: 'Verification toggled' });
});

module.exports = {
    getUsers,
    getPosts,
    deleteUser,
    deletePost,
    deleteStory,
    getStats,
    verifyUser,
};
