'use strict';

const Comment = require('./Comment');
const Post = require('../post/Post');
const Like = require('../post/Like');
const ApiError = require('../../utils/ApiError');
const { publishEvent } = require('../../config/kafka');

const addComment = async (postId, userId, { body, parentComment }) => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');

    const comment = await Comment.create({ post: postId, author: userId, body, parentComment: parentComment || null });
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // Notify via Event Bus
    publishEvent('comment_events', 'COMMENT_ADDED', {
        commentId: comment._id,
        postId,
        authorId: userId,
        postAuthorId: post.author
    });

    await comment.populate('author', 'username avatarUrl');
    return comment;
};

const getComments = async (postId, { limit = 20, cursor = null }) => {
    const query = { post: postId, parentComment: null }; // top-level only
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const comments = await Comment.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = comments.length > limit;
    const results = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return { data: results, nextCursor, hasMore };
};

const getReplies = async (commentId, { limit = 20, cursor = null }) => {
    const query = { parentComment: commentId }; // fetch child comments
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const comments = await Comment.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: 1 }) // chronologically, earliest replies first
        .limit(limit + 1);

    const hasMore = comments.length > limit;
    const results = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return { data: results, nextCursor, hasMore };
};

const deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');
    if (comment.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised to delete this comment');
    }

    await comment.deleteOne();
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    // Notify via Event Bus
    publishEvent('comment_events', 'COMMENT_DELETED', {
        commentId: comment._id,
        postId: comment.post
    });
};

const likeComment = async (commentId, userId) => {
    await Comment.findById(commentId).orFail(new ApiError(404, 'Comment not found'));
    try {
        await Like.create({ user: userId, targetId: commentId, targetModel: 'Comment' });
        await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });
        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikeComment = async (commentId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: commentId, targetModel: 'Comment' });
    if (!like) throw new ApiError(404, 'Like not found');
    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });
    return { liked: false };
};

module.exports = { addComment, getComments, getReplies, deleteComment, likeComment, unlikeComment };
