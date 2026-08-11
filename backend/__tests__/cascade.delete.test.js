// Runs against a real in-memory MongoDB. Cascading deletes are cross-collection
// arithmetic; mocking the models would only assert that the code calls the
// functions it calls.
require('./setup');

jest.mock('../src/utils/cloudinary.utils', () => ({
    deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
    uploadToCloudinary: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));
jest.mock('../src/config/kafka', () => ({
    publishEvent: jest.fn(),
    kafka: { consumer: jest.fn() },
}));
jest.mock('../src/config/ai.config', () => ({
    checkToxicity: jest.fn().mockResolvedValue(0),
    generateCaption: jest.fn().mockResolvedValue(''),
}));

const User = require('../src/modules/user/User');
const Post = require('../src/modules/post/Post');
const Like = require('../src/modules/post/Like');
const SavedPost = require('../src/modules/post/SavedPost');
const Comment = require('../src/modules/comment/Comment');
const Notification = require('../src/modules/notification/Notification');
const postService = require('../src/modules/post/post.service');
const commentService = require('../src/modules/comment/comment.service');

const makeUser = (username) =>
    User.create({
        username,
        email: `${username}@peernet.app`,
        fullName: username,
        passwordHash: 'hash',
    });

describe('cascading deletes', () => {
    let author;
    let reader;
    let post;

    beforeEach(async () => {
        [author, reader] = await Promise.all([makeUser('author'), makeUser('reader')]);
        post = await Post.create({
            author: author._id,
            mediaUrl: 'https://example.test/x.jpg',
            mediaPublicId: 'peernet/posts/x',
            mediaType: 'image',
            caption: 'hello',
        });
        await User.findByIdAndUpdate(author._id, { $inc: { postsCount: 1 } });
    });

    it('removes a post together with its likes, comments, saves and notifications', async () => {
        const comment = await commentService.addComment(post._id, reader._id, { body: 'nice' });
        await postService.likePost(post._id, reader._id);
        await postService.savePost(post._id, reader._id);

        expect(await Notification.countDocuments({})).toBeGreaterThan(0);

        await postService.deletePost(post._id, author._id);

        expect(await Post.countDocuments({})).toBe(0);
        expect(await Comment.countDocuments({})).toBe(0);
        expect(await Like.countDocuments({})).toBe(0);
        expect(await SavedPost.countDocuments({})).toBe(0);
        expect(await Notification.countDocuments({ entityId: post._id })).toBe(0);
        expect(await Notification.countDocuments({ entityId: comment._id })).toBe(0);

        const refreshed = await User.findById(author._id);
        expect(refreshed.postsCount).toBe(0);
    });

    it('removes replies with their parent and decrements commentsCount by the real total', async () => {
        const parent = await commentService.addComment(post._id, reader._id, { body: 'parent' });
        await commentService.addComment(post._id, author._id, {
            body: 'reply one',
            parentComment: parent._id,
        });
        await commentService.addComment(post._id, author._id, {
            body: 'reply two',
            parentComment: parent._id,
        });

        expect((await Post.findById(post._id)).commentsCount).toBe(3);

        await commentService.deleteComment(parent._id, reader._id);

        expect(await Comment.countDocuments({})).toBe(0);
        expect((await Post.findById(post._id)).commentsCount).toBe(0);
    });

    it('refuses a reply whose parent belongs to a different post', async () => {
        const otherPost = await Post.create({
            author: author._id,
            mediaUrl: 'https://example.test/y.jpg',
            mediaPublicId: 'peernet/posts/y',
            mediaType: 'image',
        });
        const parent = await commentService.addComment(otherPost._id, reader._id, { body: 'elsewhere' });

        await expect(
            commentService.addComment(post._id, reader._id, {
                body: 'misattached',
                parentComment: parent._id,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('never drives likesCount below zero', async () => {
        await postService.likePost(post._id, reader._id);
        await postService.unlikePost(post._id, reader._id);
        // Already unliked. Idempotent, and must not decrement again.
        await postService.unlikePost(post._id, reader._id);

        expect((await Post.findById(post._id)).likesCount).toBe(0);
    });

    it('treats unsaving something already unsaved as a no-op', async () => {
        await expect(postService.unsavePost(post._id, reader._id)).resolves.toEqual({ saved: false });
    });
});
