'use strict';

const adminService = require('../services/admin.service');
const { parsePagination } = require('../utils/pagination.utils');

const getUsers = async (req, res, next) => {
    try {
        const { limit } = parsePagination(req.query);
        const skip = parseInt(req.query.skip, 10) || 0;
        const result = await adminService.getUsers({ limit, skip, search: req.query.q || '' });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
    try {
        await adminService.deleteUser(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
    try {
        await adminService.deletePost(req.params.id);
        res.json({ success: true, message: 'Post deleted' });
    } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
    try {
        const stats = await adminService.getPlatformStats();
        res.json({ success: true, data: stats });
    } catch (err) { next(err); }
};

const toggleVerification = async (req, res, next) => {
    try {
        const user = await adminService.toggleUserVerification(req.params.id);
        res.json({ success: true, data: user, message: `User verification ${user.isVerified ? 'enabled' : 'disabled'}` });
    } catch (err) { next(err); }
};

module.exports = { getUsers, deleteUser, deletePost, getStats, toggleVerification };
