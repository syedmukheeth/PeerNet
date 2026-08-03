// Runs against a real in-memory MongoDB. The purge is thirteen collections of
// interdependent deletes and denormalised counter arithmetic, so mocking the
// models would only assert that the code calls the functions it calls.
require('./setup');

const mongoose = require('mongoose');

// Cloudinary and Redis are the two external services the purge touches.
jest.mock('../src/utils/cloudinary.utils', () => ({
    deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
    uploadToCloudinary: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const Follower = require('../src/modules/user/Follower');
const Post = require('../src/modules/post/Post');
const Like = require('../src/modules/post/Like');
const SavedPost = require('../src/modules/post/SavedPost');
const Comment = require('../src/modules/comment/Comment');
const Story = require('../src/modules/story/Story');
const Conversation = require('../src/modules/chat/Conversation');
const Message = require('../src/modules/chat/Message');
const Notification = require('../src/modules/notification/Notification');
const { getRedisOptional } = require('../src/config/redis');
const { deleteFromCloudinary } = require('../src/utils/cloudinary.utils');
const { purgeUser } = require('../src/modules/user/userPurge.service');

const makeUser = (overrides = {}) =>
    User.create({
        username: overrides.username || 'someone',
        email: overrides.email || `${overrides.username || 'someone'}@peernet.app`,
        fullName: overrides.fullName || 'Some One',
        passwordHash: 'hash',
        ...overrides,
    });

describe('userPurge.service/purgeUser', () => {
    let guest;
    let admin;
    let bystander;

    beforeEach(async () => {
        guest = await makeUser({ username: 'guest_abcd1234', isGuest: true });
        admin = await makeUser({ username: 'theadmin', role: 'admin' });
        bystander = await makeUser({ username: 'bystander' });
    });

    it('removes everything the user owns and leaves nobody else damaged', async () => {
        // The guest follows the admin, exactly as guestLogin does.
        await Follower.create({ follower: guest._id, following: admin._id });
        await User.findByIdAndUpdate(guest._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(admin._id, { $inc: { followersCount: 1 } });
        // And the bystander follows the guest.
        await Follower.create({ follower: bystander._id, following: guest._id });
        await User.findByIdAndUpdate(bystander._id, { $inc: { followingCount: 1 } });

        // The guest's own post, with a comment and a like from the bystander.
        const guestPost = await Post.create({
            author: guest._id,
            mediaUrl: 'https://cdn/x.jpg',
            mediaPublicId: 'peernet/x',
            mediaType: 'image',
            likesCount: 1,
            commentsCount: 1,
        });
        await Comment.create({ post: guestPost._id, author: bystander._id, body: 'nice' });
        await Like.create({ user: bystander._id, targetId: guestPost._id, targetModel: 'Post' });
        await SavedPost.create({ user: bystander._id, post: guestPost._id });

        // The bystander's post, which the guest liked and commented on.
        const otherPost = await Post.create({
            author: bystander._id,
            mediaUrl: 'https://cdn/y.jpg',
            mediaPublicId: 'peernet/y',
            mediaType: 'image',
            likesCount: 1,
            commentsCount: 1,
        });
        await Like.create({ user: guest._id, targetId: otherPost._id, targetModel: 'Post' });
        await Comment.create({ post: otherPost._id, author: guest._id, body: 'hello' });

        // A story of the bystander's that the guest viewed.
        const otherStory = await Story.create({
            author: bystander._id,
            mediaUrl: 'https://cdn/s.jpg',
            mediaPublicId: 'peernet/s',
            viewers: [guest._id, bystander._id],
        });

        // A conversation between the guest and the bystander.
        const convo = await Conversation.create({
            participants: [guest._id, bystander._id],
        });
        await Message.create({ conversation: convo._id, sender: guest._id, body: 'hi' });
        await Message.create({ conversation: convo._id, sender: bystander._id, body: 'hey' });

        await Notification.create({
            recipient: bystander._id,
            sender: guest._id,
            type: 'like',
            entityId: otherPost._id,
            entityModel: 'Post',
        });

        const result = await purgeUser(guest._id);

        expect(result.skipped).toBe(false);
        expect(result.username).toBe('guest_abcd1234');

        // The user is gone.
        expect(await User.findById(guest._id)).toBeNull();

        // Nothing they owned survives.
        expect(await Post.countDocuments({ author: guest._id })).toBe(0);
        expect(await Comment.countDocuments({ author: guest._id })).toBe(0);
        expect(await Like.countDocuments({ user: guest._id })).toBe(0);
        expect(await SavedPost.countDocuments({ user: guest._id })).toBe(0);
        expect(await Follower.countDocuments({
            $or: [{ follower: guest._id }, { following: guest._id }],
        })).toBe(0);
        expect(await Conversation.countDocuments({ participants: guest._id })).toBe(0);
        expect(await Message.countDocuments({ sender: guest._id })).toBe(0);
        expect(await Notification.countDocuments({
            $or: [{ recipient: guest._id }, { sender: guest._id }],
        })).toBe(0);

        // Nothing hanging off the guest's deleted post survives either.
        expect(await Comment.countDocuments({ post: guestPost._id })).toBe(0);
        expect(await Like.countDocuments({ targetId: guestPost._id })).toBe(0);
        expect(await SavedPost.countDocuments({ post: guestPost._id })).toBe(0);
        // Including the other participant's messages in the shared thread.
        expect(await Message.countDocuments({ conversation: convo._id })).toBe(0);

        // Denormalised counters on OTHER users are corrected, not left inflated.
        const adminAfter = await User.findById(admin._id).lean();
        expect(adminAfter.followersCount).toBe(0);

        const bystanderAfter = await User.findById(bystander._id).lean();
        expect(bystanderAfter.followingCount).toBe(0);

        const otherPostAfter = await Post.findById(otherPost._id).lean();
        expect(otherPostAfter.likesCount).toBe(0);
        expect(otherPostAfter.commentsCount).toBe(0);

        // The bystander's own story survives, minus the guest's view record.
        const storyAfter = await Story.findById(otherStory._id).lean();
        expect(storyAfter).not.toBeNull();
        expect(storyAfter.viewers.map(String)).toEqual([String(bystander._id)]);

        // The bystander themselves is untouched.
        expect(await User.findById(bystander._id)).not.toBeNull();

        // Media was cleaned up.
        expect(deleteFromCloudinary).toHaveBeenCalledWith('peernet/x', 'image');
    });

    it('never drives a counter below zero when it is already at zero', async () => {
        // A follow edge exists but the counters were never incremented, which is
        // what a partially applied earlier purge looks like.
        await Follower.create({ follower: guest._id, following: admin._id });
        expect((await User.findById(admin._id).lean()).followersCount).toBe(0);

        await purgeUser(guest._id);

        const adminAfter = await User.findById(admin._id).lean();
        expect(adminAfter.followersCount).toBe(0);
        expect(adminAfter.followersCount).toBeGreaterThanOrEqual(0);
    });

    it('is idempotent: a second run is a clean no-op', async () => {
        await Post.create({
            author: guest._id,
            mediaUrl: 'https://cdn/x.jpg',
            mediaPublicId: 'peernet/x',
            mediaType: 'image',
        });

        const first = await purgeUser(guest._id);
        expect(first.skipped).toBe(false);
        expect(first.posts).toBe(1);

        const second = await purgeUser(guest._id);
        expect(second.skipped).toBe(true);

        // The bystander's counters did not move on the second pass.
        const bystanderAfter = await User.findById(bystander._id).lean();
        expect(bystanderAfter.followersCount).toBe(0);
        expect(bystanderAfter.followingCount).toBe(0);
    });

    it('returns skipped for an unknown id', async () => {
        const result = await purgeUser(new mongoose.Types.ObjectId());
        expect(result.skipped).toBe(true);
    });

    it('completes when Redis is unavailable', async () => {
        getRedisOptional.mockReturnValue(null);
        await Post.create({
            author: guest._id,
            mediaUrl: 'https://cdn/x.jpg',
            mediaPublicId: 'peernet/x',
            mediaType: 'image',
        });

        const result = await purgeUser(guest._id);

        expect(result.skipped).toBe(false);
        expect(await User.findById(guest._id)).toBeNull();
    });

    it('completes even when Redis is connected but rejects every command', async () => {
        // A client can exist and still be closed, in which case every command
        // rejects. That must not abort a purge that already deleted rows.
        getRedisOptional.mockReturnValue({
            del: jest.fn().mockRejectedValue(new Error('The client is closed')),
            multi: jest.fn(),
        });

        await purgeUser(guest._id);

        expect(await User.findById(guest._id)).toBeNull();
    });
});
