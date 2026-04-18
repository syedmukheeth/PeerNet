'use strict';

const adminService = require('./admin.service');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

const getUsers = catchAsync(async (req, res) => {
    const { limit, skip, search, role, status } = req.query;
    const data = await adminService.getUsers({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0, 
        search,
        role,
        status
    });
    res.json({ success: true, ...data });
});

const updateUserStatus = catchAsync(async (req, res) => {
    const { status, reason } = req.body;
    const user = await adminService.updateUserStatus(req.user.id, req.params.userId, status, reason);
    res.json({ success: true, data: user, message: `User status updated to ${status}` });
});

const resetUserPassword = catchAsync(async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    await adminService.resetUserPassword(req.user.id, req.params.userId, newPassword);
    res.json({ success: true, message: 'User password reset successfully' });
});

const getPosts = catchAsync(async (req, res) => {
    const { limit, skip, type, status, search } = req.query;
    const data = await adminService.getPosts({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0,
        type: type || 'all',
        status,
        search
    });
    res.json({ success: true, ...data });
});

const updatePostVisibility = catchAsync(async (req, res) => {
    const { isHidden, reason } = req.body;
    await adminService.updatePostVisibility(req.user.id, req.params.postId, isHidden, reason);
    res.json({ success: true, message: `Post ${isHidden ? 'hidden' : 'restored'}` });
});

const getFeedback = catchAsync(async (req, res) => {
    const { limit, skip } = req.query;
    const data = await adminService.getFeedback({ 
        limit: parseInt(limit) || 20, 
        skip: parseInt(skip) || 0 
    });
    res.json({ success: true, ...data });
});

const getReports = catchAsync(async (req, res) => {
    const { limit, skip, status } = req.query;
    const data = await adminService.getReports({
        limit: parseInt(limit) || 20,
        skip: parseInt(skip) || 0,
        status
    });
    res.json({ success: true, ...data });
});

const resolveReport = catchAsync(async (req, res) => {
    const { status, resolution } = req.body;
    await adminService.resolveReport(req.user.id, req.params.reportId, status, resolution);
    res.json({ success: true, message: `Report ${status}` });
});

const getAuditLogs = catchAsync(async (req, res) => {
    const { limit, skip, search } = req.query;
    const data = await adminService.getAuditLogs({
        limit: parseInt(limit) || 50,
        skip: parseInt(skip) || 0,
        search
    });
    res.json({ success: true, ...data });
});

const deleteUser = catchAsync(async (req, res) => {
    const { reason } = req.body;
    await adminService.deleteUser(req.user.id, req.params.userId || req.params.id, reason);
    res.json({ success: true, message: 'User deleted' });
});

const deletePost = catchAsync(async (req, res) => {
    const { reason } = req.body;
    await adminService.deletePost(req.user.id, req.params.postId || req.params.id, reason);
    res.json({ success: true, message: 'Post deleted' });
});

const deleteStory = catchAsync(async (req, res) => {
    await adminService.deleteStory(req.params.storyId);
    res.json({ success: true, message: 'Story deleted' });
});

const getStats = catchAsync(async (req, res) => {
    // Basic stats for top cards
    const stats = await adminService.getPlatformStats();
    res.json({ success: true, data: stats });
});

const getAnalytics = catchAsync(async (req, res) => {
    // Detailed stats for charts
    const data = await adminService.getAdvancedStats();
    res.json({ success: true, data });
});

const verifyUser = catchAsync(async (req, res) => {
    const user = await adminService.toggleUserVerification(req.user.id, req.params.userId || req.params.id);
    res.json({ success: true, data: user, message: 'Verification toggled' });
});

const nukeInfrastructure = catchAsync(async (req, res) => {
    const { type, confirmationCode } = req.body;
    
    if (confirmationCode !== 'PURGE_NETWORK') {
        throw new ApiError(400, 'Invalid confirmation code for infrastructure nuke');
    }

    const result = await adminService.nukeInfrastructure(req.user.id, type);
    res.json({ success: true, data: result, message: `Infrastructure purge [${type}] executed successfully` });
});

module.exports = {
    getUsers,
    updateUserStatus,
    resetUserPassword,
    getPosts,
    updatePostVisibility,
    getFeedback,
    getReports,
    resolveReport,
    getAuditLogs,
    deleteUser,
    deletePost,
    deleteStory,
    getStats,
    getAnalytics,
    verifyUser,
    nukeInfrastructure,
};
