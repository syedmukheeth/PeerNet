'use strict';

const Comment = require('./Comment');
const Post = require('../post/Post');
const Dscroll = require('../dscroll/Dscroll');
const Like = require('../post/Like');
const ApiError = require('../../utils/ApiError');
const { checkToxicity } = require('../../config/ai.config');
const notificationService = require('../notification/notification.service');

const addComment = async (postId, userId, { body, parentComment }) => {
    const trimmedBody = body.trim();

    // 1. Resolve Target (Post or Dscroll)
    let post = await Post.findById(postId);
    let targetModel = 'Post';
    if (!post) {
        post = await Dscroll.findById(postId);
        targetModel = 'Dscroll';
    }
    if (!post) throw new ApiError(404, 'Post or Video not found');

    // 2. Duplicate Prevention — check last 5 seconds with correct field
    const dupQuery = {
        author: userId,
        body: trimmedBody,
        createdAt: { $gt: new Date(Date.now() - 5000) },
        ...(targetModel === 'Post' ? { post: postId } : { dscroll: postId })
    };
    const existing = await Comment.findOne(dupQuery);
    if (existing) throw new ApiError(409, 'Duplicate comment detected. Please wait a moment.');

    // 3. AI Toxicity Check
    const toxicityScore = await checkToxicity(trimmedBody);
    if (toxicityScore > 0.7) {
        throw new ApiError(400, 'Comment rejected by AI Community Safety Filter');
    }

    // 4. Create comment with CORRECT field (post vs dscroll)
    const commentData = {
        author: userId,
        body: trimmedBody,
        parentComment: parentComment || null,
        isAiVerified: true,
        toxicityScore,
        ...(targetModel === 'Post' ? { post: postId } : { dscroll: postId })
    };
    const comment = await Comment.create(commentData);

    // 5. Update count on the correct model
    if (targetModel === 'Post') {
        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    } else {
        await Dscroll.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    // 6. Notify post/comment author
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

    await comment.populate('author', 'username avatarUrl isVerified');
    return comment;
};

const getComments = async (postId, { limit = 20, cursor = null }) => {
    // Search both post AND dscroll fields to handle both content types
    const query = {
        parentComment: null,
        $or: [{ post: postId }, { dscroll: postId }]
    };
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
    const query = { parentComment: commentId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const comments = await Comment.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: 1 })
        .limit(limit + 1);

    const hasMore = comments.length > limit;
    const results = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return { data: results, nextCursor, hasMore };
};

const deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');

    // Auth: Either comment author OR the post/dscroll owner can delete
    const isAuthor = comment.author.toString() === userId.toString();
    let isPostOwner = false;
    if (!isAuthor) {
        // Check against whichever parent field is set
        const parentId = comment.post || comment.dscroll;
        let parentDoc = await Post.findById(parentId).select('author').lean();
        if (!parentDoc) parentDoc = await Dscroll.findById(parentId).select('author').lean();
        isPostOwner = parentDoc?.author?.toString() === userId.toString();
    }

    if (!isAuthor && !isPostOwner) {
        throw new ApiError(403, 'Not authorised to delete this comment');
    }

    await comment.deleteOne();

    // Decrement count on the right model
    if (comment.post) {
        await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
    } else if (comment.dscroll) {
        await Dscroll.findByIdAndUpdate(comment.dscroll, { $inc: { commentsCount: -1 } });
    }

    // Remove associated notification
    await notificationService.removeNotification({ entityId: comment._id, type: 'comment' });
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
