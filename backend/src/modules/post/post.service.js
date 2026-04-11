'use strict';

const Post = require('./Post');
const User = require('../user/User');
const Like = require('./Like');
const SavedPost = require('./SavedPost');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const { getRedisOptional } = require('../../config/redis');
const ApiError = require('../../utils/ApiError');
const { publishEvent } = require('../../config/kafka');
const { generateCaption } = require('../../config/ai.config');

const POST_CACHE_TTL = 300; // 5 min

const createPost = async (userId, { caption, location, tags }, file) => {
    if (!file) throw new ApiError(400, 'Media file is required');

    const isVideo = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    const { secure_url, public_id } = await uploadToCloudinary(file.path, {
        folder: 'peernet/posts',
        resource_type: isVideo ? 'video' : 'image',
        ...(isVideo ? {} : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
    });

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];

    // AI Auto-Captioning
    let finalCaption = caption;
    if (!finalCaption && !isVideo) { // Gemini Vision works best with images
        finalCaption = await generateCaption(file.path, file.mimetype);
    }

    const post = await Post.create({
        author: userId,
        mediaUrl: secure_url,
        mediaPublicId: public_id,
        mediaType: isVideo ? 'video' : 'image',
        caption: finalCaption,
        location,
        tags: parsedTags,
    });

    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

    // Trigger asynchronous processing via Kafka
    publishEvent('post_events', 'POST_CREATED', {
        postId: post._id,
        authorId: userId,
        body: post.body,
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

const deletePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, 'Post not found');
    if (post.author.toString() !== userId.toString()) {
        throw new ApiError(403, 'Not authorised to delete this post');
    }

    await deleteFromCloudinary(post.mediaPublicId, post.mediaType === 'video' ? 'video' : 'image');
    await post.deleteOne();
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

    const redis = getRedisOptional();
    if (redis) await redis.del(`post:${postId}`);
};

const likePost = async (postId, userId) => {
    const post = await Post.findById(postId).orFail(new ApiError(404, 'Post not found'));

    try {
        await Like.create({ user: userId, targetId: postId, targetModel: 'Post' });
        await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
        
        // Notify via Event Bus
        publishEvent('post_events', 'POST_LIKED', {
            postId,
            userId,
            authorId: post.author
        });

        const redis = getRedisOptional();
        if (redis) await redis.del(`post:${postId}`);
        notificationService.createNotification({
            recipient: post.author,
            sender: userId,
            type: 'like',
            entityId: postId,
            entityModel: 'Post',
        }).catch(() => { });
        return { liked: true };
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, 'Already liked');
        throw err;
    }
};

const unlikePost = async (postId, userId) => {
    const like = await Like.findOneAndDelete({ user: userId, targetId: postId, targetModel: 'Post' });
    if (!like) throw new ApiError(404, 'Like not found');
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    // Notify via Event Bus
    publishEvent('post_events', 'POST_UNLIKED', {
        postId,
        userId
    });

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
    const saved = await SavedPost.findOneAndDelete({ user: userId, post: postId });
    if (!saved) throw new ApiError(404, 'Saved post not found');
    return { saved: false };
};

const getSavedPosts = async (userId, { limit, cursor }) => {
    const query = { user: userId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    const docs = await SavedPost.find(query)
        .populate({ path: 'post', populate: { path: 'author', select: 'username avatarUrl' } })
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const validDocs = docs.filter(d => {
        if (!d.post) {
            SavedPost.findByIdAndDelete(d._id).catch(() => {});
            return false;
        }
        return true;
    });

    const hasMore = docs.length > limit;
    const results = hasMore ? validDocs.slice(0, limit) : validDocs;
    const nextCursor = hasMore ? docs[docs.length - 1].createdAt.toISOString() : null;

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
    createPost, getPost, updatePost, deletePost,
    likePost, unlikePost,
    savePost, unsavePost, getSavedPosts,
    getUserPosts, getPostsByIds,
};
