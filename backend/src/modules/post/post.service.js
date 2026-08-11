'use strict';

const fs = require('fs/promises');
const Post = require('./Post');
const User = require('../user/User');
const logger = require('../../config/logger');
const Like = require('./Like');
const SavedPost = require('./SavedPost');
const Comment = require('../comment/Comment');
const { clampedDecrement } = require('../../utils/counters.utils');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const { getRedisOptional } = require('../../config/redis');
const ApiError = require('../../utils/ApiError');
const { publishEvent } = require('../../config/kafka');
const { generateCaption } = require('../../config/ai.config');
const notificationService = require('../notification/notification.service');

const POST_CACHE_TTL = 300; // 5 min

const createPost = async (userId, { caption, location, tags, mediaType, backgroundColor }, file) => {
    let secure_url = '';
    let public_id = '';
    let finalMediaType = mediaType || 'image';

    // Read the bytes before uploading: uploadToCloudinary unlinks the temp file
    // as soon as it completes, and the auto-caption below needs them.
    let mediaBuffer = null;

    if (finalMediaType !== 'text') {
        if (!file) throw new ApiError(400, 'Media file is required for image/video posts');
        const isVideo = file.mimetype.startsWith('video/');

        if (!isVideo && !caption) {
            try {
                mediaBuffer = await fs.readFile(file.path);
            } catch (err) {
                logger.warn(`Could not read upload for auto-captioning: ${err.message}`);
            }
        }

        const uploadResult = await uploadToCloudinary(file.path, {
            folder: 'peernet/posts',
            resource_type: isVideo ? 'video' : 'image',
            ...(isVideo ? {} : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
        });
        secure_url = uploadResult.secure_url;
        public_id = uploadResult.public_id;
        finalMediaType = isVideo ? 'video' : 'image';
    }

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    // AI Auto-Captioning (Only for images, if no caption provided)
    let finalCaption = caption;
    if (!finalCaption && finalMediaType === 'image' && mediaBuffer) {
        finalCaption = await generateCaption(mediaBuffer, file.mimetype);
    }

    const post = await Post.create({
        author: userId,
        mediaUrl: secure_url,
        mediaPublicId: public_id,
        mediaType: finalMediaType,
        backgroundColor: finalMediaType === 'text' ? backgroundColor : null,
        caption: finalCaption,
        location,
        tags: parsedTags,
    });

    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    // Trigger asynchronous processing via Kafka
    publishEvent('post_events', 'POST_CREATED', {
        postId: post._id,
        authorId: userId,
        caption: post.caption,
        createdAt: post.createdAt
    });

    return post;
};

const getPost = async (postId, userId) => {
    const redis = getRedisOptional();
    const cacheKey = `post:${postId}`;

    let post;
    const cached = redis ? await redis.get(cacheKey) : null;
    if (cached) {
        post = JSON.parse(cached);
    } else {
        post = await Post.findById(postId).populate('author', 'username fullName avatarUrl isVerified').lean();

        if (!post || post.isArchived) throw new ApiError(404, 'Post not found');
        if (redis) await redis.setEx(cacheKey, POST_CACHE_TTL, JSON.stringify(post));
    }

    let isLiked = false;
    let isSaved = false;
    if (userId) {
        const [like, saved] = await Promise.all([
            Like.findOne({ user: userId, targetId: postId, targetModel: 'Post' }),
            SavedPost.findOne({ user: userId, post: postId }),
        ]);
        isLiked = Boolean(like);
        isSaved = Boolean(saved);
    }

    return { ...post, isLiked, isSaved };
};

const updatePost = async (postId, userId, { caption }) => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    if (post.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised to edit this post');
    }
    post.caption = caption;
    await post.save();
    const redis = getRedisOptional();
    if (redis) await redis.del(`post:${postId}`);
    return post;
};

/**
 * Removes a post and everything that referenced it.
 *
 * Deleting the post document alone left its likes, comments, saves and
 * notifications behind as permanent orphans, and the author's postsCount
 * unchanged. Exported so the admin moderation path deletes exactly as much as
 * the author's own delete does. Mirrors the cascade in
 * user/userPurge.service.js. Performs no authorization: callers do that.
 */
const cascadeDeletePost = async (post) => {
    const postId = post._id;

    if (post.mediaPublicId) {
        await deleteFromCloudinary(post.mediaPublicId, post.mediaType === 'video' ? 'video' : 'image');
    }

    const comments = await Comment.find({ post: postId }).select('_id').lean();
    const commentIds = comments.map((c) => c._id);

    await Promise.all([
        Comment.deleteMany({ post: postId }),
        Like.deleteMany({ targetId: { $in: [postId, ...commentIds] } }),
        SavedPost.deleteMany({ post: postId }),
        notificationService.removeNotification({ entityId: postId, entityModel: 'Post' }),
    ]);

    if (commentIds.length > 0) {
        await notificationService.removeNotification({
            entityId: { $in: commentIds },
            entityModel: 'Comment',
        });
    }

    await Post.deleteOne({ _id: postId });
    await User.findByIdAndUpdate(post.author, clampedDecrement('postsCount'));

    const redis = getRedisOptional();
    if (redis) await redis.del(`post:${postId}`);
};

const deletePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    if (post.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised to delete this post');
    }

    await cascadeDeletePost(post);
};

const likePost = async (postId, userId) => {
    const post = await Post.findById(postId).orFail(new ApiError(404, 'Post not found'));

    try {
        await Like.create({ user: userId, targetId: postId, targetModel: 'Post' });
        await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
        
        // Notify via Direct Notification Service (Reliable Real-Time)
        if (post.author.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipient: post.author,
                sender: userId,
                type: 'like',
                entityId: postId,
                entityModel: 'Post'
            });
        }

        // Counterpart to POST_UNLIKED below. Without it the worker's ranking
        // and category-affinity branch never ran, so the personalisation the
        // feed reads back was always an empty affinity map.
        publishEvent('post_events', 'POST_LIKED', { postId, userId });

        const redis = getRedisOptional();
        if (redis) await redis.del(`post:${postId}`);
        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikePost = async (postId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: postId, targetModel: 'Post' });
    if (!like) return { liked: false }; // Idempotent: if already unliked, just succeed

    const post = await Post.findByIdAndUpdate(postId, clampedDecrement('likesCount'), { new: true })
        .select('author')
        .lean();

    // Notify via Event Bus
    publishEvent('post_events', 'POST_UNLIKED', {
        postId,
        userId
    });

    // Sync with Notifications: Remove the like alert. The full filter matters:
    // without recipient and entityModel this could match another user's
    // notification for the same post.
    if (post) {
        await notificationService.removeNotification({
            recipient: post.author,
            sender: userId,
            entityId: postId,
            entityModel: 'Post',
            type: 'like'
        });
    }

    const redis = getRedisOptional();
    if (redis) await redis.del(`post:${postId}`);
    return { liked: false };
};

const savePost = async (postId, userId) => {
    await Post.findById(postId).orFail(new ApiError(404, 'Post not found'));
    try {
        await SavedPost.create({ user: userId, post: postId });
        return { saved: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already saved');
        throw err;
    }
};

const unsavePost = async (postId, userId) => {
    // Idempotent, matching unlikePost: un-saving something already un-saved is
    // the desired end state, not an error.
    await SavedPost.findOneAndDelete({ user: userId, post: postId });
    return { saved: false };
};

const getSavedPosts = async (userId, { limit, cursor }) => {
    const query = { user: userId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const docs = await SavedPost.find(query)
        .populate({ path: 'post', populate: { path: 'author', select: 'username avatarUrl' } })
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    // Rows whose post has since been deleted. Collected and removed in one
    // batch rather than firing an unawaited delete from inside a filter.
    const staleIds = docs.filter((d) => !d.post).map((d) => d._id);
    if (staleIds.length > 0) {
        SavedPost.deleteMany({ _id: { $in: staleIds } }).catch((err) =>
            logger.warn(`Failed to clean up stale saved posts: ${err.message}`),
        );
    }

    const validDocs = docs.filter((d) => d.post);
    const hasMore = docs.length > limit;
    const results = hasMore ? validDocs.slice(0, limit) : validDocs;
    // Built from the last returned row, not from the limit+1 look-ahead row:
    // using the look-ahead skipped one saved post on every page boundary.
    const nextCursor = results.length > 0 && hasMore
        ? results[results.length - 1].createdAt.toISOString()
        : null;

    return { data: results.map((d) => d.post), nextCursor, hasMore };
};

const getUserPosts = async (userId, { limit, cursor }) => {
    const query = { author: userId, isArchived: false };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const posts = await Post.find(query)
        .populate('author', 'username avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return { data: results, nextCursor, hasMore };
};

const getPostsByIds = async (postIds) => {
    if (!postIds || postIds.length === 0) return [];
    
    const redis = getRedisOptional();
    const cacheKeys = postIds.map(id => `post:${id}`);
    
    let cachedPosts = [];
    if (redis) {
        const results = await redis.mGet(cacheKeys);
        cachedPosts = results.map(r => r ? JSON.parse(r) : null);
    } else {
        cachedPosts = postIds.map(() => null);
    }

    const missingIds = postIds.filter((_, i) => !cachedPosts[i]);
    
    if (missingIds.length > 0) {
        const dbPosts = await Post.find({ _id: { $in: missingIds } })
            .populate('author', 'username fullName avatarUrl isVerified')
            .lean();
        
        const dbPostMap = new Map(dbPosts.map(p => [p._id.toString(), p]));
        
        // Fill missing indices and cache them
        const pipeline = redis ? redis.multi() : null;
        
        postIds.forEach((id, i) => {
            if (!cachedPosts[i]) {
                const post = dbPostMap.get(id.toString());
                if (post) {
                    cachedPosts[i] = post;
                    if (pipeline) pipeline.setEx(`post:${id}`, POST_CACHE_TTL, JSON.stringify(post));
                }
            }
        });
        
        if (pipeline) await pipeline.exec();
    }

    return cachedPosts.filter(Boolean);
};

module.exports = {
    createPost, getPost, updatePost, deletePost, cascadeDeletePost,
    likePost, unlikePost,
    savePost, unsavePost, getSavedPosts,
    getUserPosts, getPostsByIds,
};
