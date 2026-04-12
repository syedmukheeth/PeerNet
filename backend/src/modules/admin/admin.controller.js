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
    const { limit, skip, type } = req.query;
    const data = await adminService.getPosts({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0,
        type: type || 'all'
    });
    res.json({ success: true, ...data });
});

const getFeedback = catchAsync(async (req, res) => {
    const { limit, skip } = req.query;
    const data = await adminService.getFeedback({ 
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

const nukeInfrastructure = catchAsync(async (req, res) => {
    const { type, confirmationCode } = req.body;
    
    // Safety check: Require a specific confirmation code
    if (confirmationCode !== 'PURGE_NETWORK') {
        throw new ApiError(400, 'Invalid confirmation code for infrastructure nuke');
    }

    const result = await adminService.nukeInfrastructure(req.user.id, type);
    res.json({ success: true, data: result, message: `Infrastructure purge [${type}] executed successfully` });
});

module.exports = {
    getUsers,
    getPosts,
    getFeedback,
    deleteUser,
    deletePost,
    deleteStory,
    getStats,
    verifyUser,
    nukeInfrastructure,
};
