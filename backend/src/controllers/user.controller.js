'use strict';

const userService = require('../services/user.service');
const postService = require('../services/post.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination.utils');

const getProfile = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.params.id, req.user._id);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.user._id, req.user._id);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateProfile(req.user._id, req.body, req.file || null);
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

const follow = async (req, res, next) => {
    try {
        const result = await userService.follow(req.user._id, req.params.id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unfollow = async (req, res, next) => {
    try {
        const result = await userService.unfollow(req.user._id, req.params.id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const getFollowers = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const skip = cursor ? 0 : 0;
        const data = await userService.getFollowers(req.params.id, { limit, skip });
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const getFollowing = async (req, res, next) => {
    try {
        const { limit } = parsePagination(req.query);
        const data = await userService.getFollowing(req.params.id, { limit, skip: 0 });
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const searchUsers = async (req, res, next) => {
    try {
        const { limit } = parsePagination(req.query);
        const users = await userService.searchUsers(req.query.q, { limit, skip: 0 });
        res.json({ success: true, data: users });
    } catch (err) { next(err); }
};

const getUserPosts = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await postService.getUserPosts(req.params.id, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

module.exports = {
    getProfile, getMe, updateProfile,
    follow, unfollow,
    getFollowers, getFollowing,
    searchUsers, getUserPosts,
};
