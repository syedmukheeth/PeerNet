'use strict';

const Comment = require('./Comment');
const Post = require('../post/Post');
const Dscroll = require('../dscroll/Dscroll');
const Like = require('../post/Like');
const ApiError = require('../../utils/ApiError');
const { publishEvent } = require('../../config/kafka');
const { checkToxicity } = require('../../config/ai.config');
const notificationService = require('../notification/notification.service');

const addComment = async (postId, userId, { body, parentComment }) => {
    // 1. Duplicate Prevention (Rate Limiting/Lag check)
    // Check if user posted same comment in last 5 seconds
    const existing = await Comment.findOne({
        author: userId,
        post: postId,
        body: body.trim(),
        createdAt: { $gt: new Date(Date.now() - 5000) }
    });
    if (existing) throw new ApiError(409, 'Duplicate comment detected. Please wait.');

    // 2. Resolve Target
    let post = await Post.findById(postId);
    let targetModel = 'Post';
    if (!post) {
        post = await Dscroll.findById(postId);
        targetModel = 'Dscroll';
    }
    if (!post) throw new ApiError(404, 'Post or Video not found');

    // AI Toxicity Check
    const toxicityScore = await checkToxicity(body);
    if (toxicityScore > 0.7) {
        throw new ApiError(400, 'Comment rejected by AI Community Safety Filter');
    }

    const comment = await Comment.create({ 
        post: postId, 
        author: userId, 
        body: body.trim(), 
        parentComment: parentComment || null,
        isAiVerified: true,
        toxicityScore
    });

    // Update count on the correct model
    if (targetModel === 'Post') {
        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    } else {
        await Dscroll.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    // Notify via Direct Notification Service (Reliable Real-Time)
    if (parentComment) {
        const parent = await Comment.findById(parentComment);
        if (parent && parent.author.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipient: parent.author,
                sender: userId,
                type: 'reply',
                entityId: comment._id,
                entityModel: 'Comment'
            });
        }
    } else {
        if (post.author.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipient: post.author,
                sender: userId,
                type: 'comment',
                entityId: comment._id,
                entityModel: 'Comment'
            });
        }
    }

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

    // Fetch the post to check if the user is the owner
    const post = await Post.findById(comment.post) || await Dscroll.findById(comment.post);
    
    // Auth: Either comment author OR post owner can delete
    const isAuthor = comment.author.toString() === userId.toString();
    const isPostOwner = post?.author?.toString() === userId.toString();

    if (!isAuthor && !isPostOwner) {
        throw new ApiError(403, 'Not authorised to delete this comment');
    }

    await comment.deleteOne();
    
    // Update count on correct model (Post or Dscroll)
    const postUpdated = await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
    if (!postUpdated) {
        await Dscroll.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
    }

    // Sync with Notifications: Remove the comment alert
    await notificationService.removeNotification({
        entityId: comment._id,
        type: 'comment'
    });
};

const likeComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId).orFail(new ApiError(404, 'Comment not found'));
    try {
        await Like.create({ user: userId, targetId: commentId, targetModel: 'Comment' });
        await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });

        // Notify via Direct Notification Service (Reliable Real-Time)
        if (comment.author.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipient: comment.author,
                sender: userId,
                type: 'like',
                entityId: commentId,
                entityModel: 'Comment'
            });
        }

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
