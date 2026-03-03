'use strict';

const postService = require('../services/post.service');
const feedService = require('../services/feed.service');
const notificationService = require('../services/notification.service');
const { parsePagination } = require('../utils/pagination.utils');

const getFeed = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await feedService.getFeed(req.user._id, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const createPost = async (req, res, next) => {
    try {
        const post = await postService.createPost(req.user._id, req.body, req.file);
        res.status(201).json({ success: true, data: post });
    } catch (err) { next(err); }
};

const getPost = async (req, res, next) => {
    try {
        const post = await postService.getPost(req.params.id, req.user._id);
        res.json({ success: true, data: post });
    } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
    try {
        await postService.deletePost(req.params.id, req.user._id);
        res.json({ success: true, message: 'Post deleted' });
    } catch (err) { next(err); }
};

const likePost = async (req, res, next) => {
    try {
        const result = await postService.likePost(req.params.id, req.user._id);
        // Fire notification async
        notificationService.createNotification({
            recipient: req.params.id, // Will be resolved to post author in a production setup
            sender: req.user._id,
            type: 'like',
            entityId: req.params.id,
            entityModel: 'Post',
        }).catch(() => { });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unlikePost = async (req, res, next) => {
    try {
        const result = await postService.unlikePost(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const savePost = async (req, res, next) => {
    try {
        const result = await postService.savePost(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unsavePost = async (req, res, next) => {
    try {
        const result = await postService.unsavePost(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const getSavedPosts = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await postService.getSavedPosts(req.user._id, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

module.exports = {
    getFeed, createPost, getPost, deletePost,
    likePost, unlikePost,
    savePost, unsavePost, getSavedPosts,
};
