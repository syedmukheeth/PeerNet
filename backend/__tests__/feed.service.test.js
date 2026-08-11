// Runs against a real in-memory MongoDB, with Redis absent so the direct
// query path is what gets exercised. That path is where the removed
// self-heal write and the broken cursor lived.
require('./setup');

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));
jest.mock('../src/config/kafka', () => ({
    publishEvent: jest.fn(),
    kafka: { consumer: jest.fn() },
}));

const User = require('../src/modules/user/User');
const Post = require('../src/modules/post/Post');
const Follower = require('../src/modules/user/Follower');
const { getFeed } = require('../src/modules/feed/feed.service');

const makeUser = (username, overrides = {}) =>
    User.create({
        username,
        email: `${username}@peernet.app`,
        fullName: username,
        passwordHash: 'hash',
        ...overrides,
    });

const makePost = (author, overrides = {}) =>
    Post.create({
        author: author._id,
        mediaUrl: 'https://example.test/x.jpg',
        mediaPublicId: `peernet/posts/${Math.random()}`,
        mediaType: 'image',
        ...overrides,
    });

describe('feed.service/getFeed', () => {
    let viewer;

    beforeEach(async () => {
        viewer = await makeUser('viewer');
    });

    it('returns an empty feed without writing anything when there are no posts', async () => {
        const result = await getFeed(viewer._id, { limit: 20 });

        expect(result.data).toEqual([]);
        expect(result.hasMore).toBe(false);
        // The old self-heal step inserted two hard-coded posts here.
        expect(await Post.countDocuments({})).toBe(0);
    });

    it('never serves archived or hidden posts', async () => {
        const author = await makeUser('author');
        await Follower.create({ follower: viewer._id, following: author._id });

        await makePost(author, { caption: 'visible' });
        await makePost(author, { caption: 'archived', isArchived: true });
        await makePost(author, { caption: 'hidden', isHidden: true });

        const result = await getFeed(viewer._id, { limit: 20 });
        const captions = result.data.map((p) => p.caption);

        expect(captions).toContain('visible');
        expect(captions).not.toContain('archived');
        expect(captions).not.toContain('hidden');
    });

    it('keeps private accounts out of the discovery tier', async () => {
        const stranger = await makeUser('stranger', { isPrivate: true });
        await makePost(stranger, { caption: 'private post', likesCount: 5 });

        const result = await getFeed(viewer._id, { limit: 20 });
        expect(result.data.map((p) => p.caption)).not.toContain('private post');
    });

    it('shows a private account to a follower', async () => {
        const stranger = await makeUser('stranger', { isPrivate: true });
        await Follower.create({ follower: viewer._id, following: stranger._id });
        await makePost(stranger, { caption: 'private post' });

        const result = await getFeed(viewer._id, { limit: 20 });
        expect(result.data.map((p) => p.caption)).toContain('private post');
    });

    it('pages without skipping or repeating a post', async () => {
        const author = await makeUser('author');
        await Follower.create({ follower: viewer._id, following: author._id });

        // Varying engagement so the ranking is not the same as date order,
        // which is what made the old createdAt cursor lose posts.
        for (let i = 0; i < 12; i += 1) {
            await makePost(author, { caption: `post-${i}`, likesCount: i % 4 });
        }

        const seen = [];
        let cursor = null;
        let guard = 0;

        do {
            const page = await getFeed(viewer._id, { limit: 5, cursor });
            seen.push(...page.data.map((p) => p.caption));
            cursor = page.nextCursor;
            guard += 1;
        } while (cursor && guard < 10);

        expect(seen).toHaveLength(12);
        expect(new Set(seen).size).toBe(12);
    });
});
