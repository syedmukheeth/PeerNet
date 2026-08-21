// Search was a bare $text query, which matches whole stemmed words. Typing "jo"
// found nothing for "john", so you had to know a name before you could look it
// up. It also had no status filter, no self-exclusion, and never returned the
// follow relation, so every result rendered "Follow" regardless of the truth.
require('./setup');

const mongoose = require('mongoose');

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const Follower = require('../src/modules/user/Follower');
const userService = require('../src/modules/user/user.service');

const makeUser = (username, overrides = {}) => User.create({
    username,
    fullName: overrides.fullName || 'Some One',
    email: `${username}@example.com`,
    passwordHash: 'x'.repeat(20),
    ...overrides,
});

describe('user.service searchUsers', () => {
    let viewer;

    beforeEach(async () => {
        viewer = await makeUser('viewer', { fullName: 'The Viewer' });
    });

    // The headline fix.
    it('matches a prefix, so two letters find a longer name', async () => {
        await makeUser('john', { fullName: 'John Smith' });

        const { data } = await userService.searchUsers('jo', { viewerId: viewer._id });
        expect(data.map((u) => u.username)).toContain('john');
    });

    it('matches inside a name too, not only at the start', async () => {
        await makeUser('bigjohn', { fullName: 'Big John' });

        const { data } = await userService.searchUsers('john', { viewerId: viewer._id });
        expect(data.map((u) => u.username)).toContain('bigjohn');
    });

    it('puts prefix matches above the rest', async () => {
        // The one that merely contains the term is far more popular, so without
        // the prefix rule it would sort first.
        await makeUser('bigjo', { fullName: 'Big Jo', followersCount: 5000 });
        await makeUser('jonas', { fullName: 'Jonas', followersCount: 1 });

        const { data } = await userService.searchUsers('jo', { viewerId: viewer._id });
        expect(data[0].username).toBe('jonas');
    });

    it('never returns the person doing the searching', async () => {
        const { data } = await userService.searchUsers('viewer', { viewerId: viewer._id });
        expect(data.map((u) => u.username)).not.toContain('viewer');
    });

    it('leaves out accounts that are not active', async () => {
        await makeUser('banned', { fullName: 'Banned Person', status: 'banned' });

        const { data } = await userService.searchUsers('banned', { viewerId: viewer._id });
        expect(data).toHaveLength(0);
    });

    // Every row said "Follow", including for people you already followed,
    // because the endpoint never sent this.
    it('says whether the viewer already follows each result', async () => {
        const followed = await makeUser('followed', { fullName: 'Followed Person' });
        await makeUser('stranger', { fullName: 'Followed Stranger' });
        await Follower.create({ follower: viewer._id, following: followed._id });

        const { data } = await userService.searchUsers('followed', { viewerId: viewer._id });

        const byName = Object.fromEntries(data.map((u) => [u.username, u.isFollowing]));
        expect(byName.followed).toBe(true);
        expect(byName.stranger).toBe(false);
    });

    it('reports whether another page exists', async () => {
        await Promise.all(
            Array.from({ length: 5 }, (_, i) => makeUser(`match${i}`, { fullName: `Match ${i}` })),
        );

        const first = await userService.searchUsers('match', { limit: 2, viewerId: viewer._id });
        expect(first.data).toHaveLength(2);
        expect(first.hasMore).toBe(true);

        const last = await userService.searchUsers('match', { limit: 50, viewerId: viewer._id });
        expect(last.hasMore).toBe(false);
    });

    it('is case insensitive', async () => {
        await makeUser('mixedcase', { fullName: 'Mixed Case' });

        const { data } = await userService.searchUsers('MIXEDCASE', { viewerId: viewer._id });
        expect(data).toHaveLength(1);
    });

    // A regex built from raw input would either throw or match everything.
    it('treats regex characters in the query as literal text', async () => {
        await makeUser('normal', { fullName: 'Normal Person' });

        const { data } = await userService.searchUsers('.*', { viewerId: viewer._id });
        expect(data).toHaveLength(0);
    });

    it('rejects an empty query', async () => {
        await expect(userService.searchUsers('   ', { viewerId: viewer._id }))
            .rejects.toThrow(/at least 1 character/);
    });

    afterEach(async () => {
        await Promise.all(
            Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
        );
    });
});
