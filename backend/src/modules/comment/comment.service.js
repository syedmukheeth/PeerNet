'use strict';

const Comment = require('./Comment');
const Post = require('../post/Post');
const Like = require('../post/Like');
const ApiError = require('../../utils/ApiError');
const { checkToxicity } = require('../../config/ai.config');
const { publishEvent } = require('../../config/kafka');
const { clampedDecrement } = require('../../utils/counters.utils');
const notificationService = require('../notification/notification.service');

const addComment = async (postId, userId, { body, parentComment }) => {
    const trimmedBody = body.trim();

    // 1. Resolve Target
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');

    // 2. Duplicate Prevention
    const existing = await Comment.findOne({
        author: userId,
        body: trimmedBody,
        createdAt: { $gt: new Date(Date.now() - 5000) },
        post: postId,
    });
    if (existing) throw new ApiError(409, 'Duplicate comment detected. Please wait a moment.');

    // 3. A reply has to belong to the same post as its parent. Without this a
    // reply could be attached to a comment on a different post, and the reply
    // notification would then link the recipient to the wrong thread.
    if (parentComment) {
        const parent = await Comment.findById(parentComment).select('post').lean();
        if (!parent) throw new ApiError(404, 'Parent comment not found');
        if (parent.post.toString() !== postId.toString()) {
            throw new ApiError(400, 'Parent comment belongs to a different post');
        }
    }

    // 4. AI Toxicity Check
    const toxicityScore = await checkToxicity(trimmedBody);
    if (toxicityScore > 0.7) {
        throw new ApiError(400, 'Comment rejected by AI Community Safety Filter');
    }

    // 5. Create comment
    const comment = await Comment.create({
        author: userId,
        body: trimmedBody,
        parentComment: parentComment || null,
        isAiVerified: true,
        toxicityScore,
        post: postId,
    });

    // 6. Update count
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // The feed worker subscribes to comment_events to re-rank the post, but
    // nothing ever published to that topic.
    publishEvent('comment_events', 'COMMENT_ADDED', {
        postId,
        commentId: comment._id,
        userId,
    });

    // 7. Notify post/comment author
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
    const query = {
        parentComment: null,
        post: postId,
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

/**
 * Removes a comment, its replies, their likes and their notifications.
 *
 * Exported so the admin moderation path deletes exactly as much as the author's
 * own delete does. Performs no authorization: callers do that.
 */
const cascadeDeleteComment = async (comment, userId) => {
    // Deleting a comment used to leave its replies and every Like row pointing
    // at it behind, and decremented commentsCount by exactly 1 no matter how
    // many replies went with it.
    const replies = await Comment.find({ parentComment: comment._id }).select('_id').lean();
    const replyIds = replies.map((r) => r._id);
    const removedIds = [comment._id, ...replyIds];

    await Comment.deleteMany({ _id: { $in: removedIds } });
    await Like.deleteMany({ targetId: { $in: removedIds }, targetModel: 'Comment' });

    if (comment.post) {
        await Post.findByIdAndUpdate(comment.post, clampedDecrement('commentsCount', removedIds.length));
        publishEvent('comment_events', 'COMMENT_DELETED', {
            postId: comment.post,
            commentId: comment._id,
            userId,
        });
    }

    // Remove the notifications for the comment and every reply. The type varies
    // by how the comment was created, so all three are cleared.
    await Promise.all(
        removedIds.flatMap((id) =>
            ['comment', 'reply', 'like'].map((type) =>
                notificationService.removeNotification({ entityId: id, entityModel: 'Comment', type }),
            ),
        ),
    );
};

const deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');

    // Auth: Either comment author OR the post owner can delete
    const isAuthor = comment.author.toString() === userId.toString();
    let isPostOwner = false;
    if (!isAuthor) {
        const parentDoc = await Post.findById(comment.post).select('author').lean();
        isPostOwner = parentDoc?.author?.toString() === userId.toString();
    }

    if (!isAuthor && !isPostOwner) {
        throw new ApiError(403, 'Not authorised to delete this comment');
    }

    await cascadeDeleteComment(comment, userId);
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
    // Idempotent, matching unlikePost. Throwing 404 here meant a double-tap or a
    // retried request surfaced as an error for a no-op.
    if (!like) return { liked: false };

    const comment = await Comment.findByIdAndUpdate(commentId, clampedDecrement('likesCount'), { new: true })
        .select('author')
        .lean();

    // Sync with Notifications: Remove the like alert
    if (comment) {
        await notificationService.removeNotification({
            recipient: comment.author,
            sender: userId,
            entityId: commentId,
            entityModel: 'Comment',
            type: 'like'
        });
    }

    return { liked: false };
};

module.exports = {
    addComment, getComments, getReplies,
    deleteComment, cascadeDeleteComment,
    likeComment, unlikeComment,
};
