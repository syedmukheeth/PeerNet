'use strict';

const commentService = require('../services/comment.service');
const { parsePagination } = require('../utils/pagination.utils');

const addComment = async (req, res, next) => {
    try {
        const comment = await commentService.addComment(req.params.postId, req.user._id, req.body);
        res.status(201).json({ success: true, data: comment });
    } catch (err) { next(err); }
};

const getComments = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await commentService.getComments(req.params.postId, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getReplies = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await commentService.getReplies(req.params.commentId, { limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const deleteComment = async (req, res, next) => {
    try {
        await commentService.deleteComment(req.params.id, req.user._id);
        res.json({ success: true, message: 'Comment deleted' });
    } catch (err) { next(err); }
};

const likeComment = async (req, res, next) => {
    try {
        const result = await commentService.likeComment(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unlikeComment = async (req, res, next) => {
    try {
        const result = await commentService.unlikeComment(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { addComment, getComments, getReplies, deleteComment, likeComment, unlikeComment };
