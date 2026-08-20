// Runs against a real in-memory MongoDB. Pin, mute and archive are stored as
// arrays of user ids under metadata, so the thing worth proving is that they
// stay per participant: these were previously client-side flags in
// localStorage, where "per participant" was not even expressible.
require('./setup');

const mongoose = require('mongoose');

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const Conversation = require('../src/modules/chat/Conversation');
const chatService = require('../src/modules/chat/chat.service');

const makeUser = (username) => User.create({
    username,
    fullName: 'Some One',
    email: `${username}@example.com`,
    passwordHash: 'x'.repeat(20),
});

describe('chat.service conversation state', () => {
    let alice;
    let bob;
    let convo;

    beforeEach(async () => {
        alice = await makeUser('alice');
        bob = await makeUser('bob');
        convo = await Conversation.create({ participants: [alice._id, bob._id] });
    });

    it('pins for one participant without touching the other', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);

        const [forAlice] = await chatService.getUserConversations(alice._id);
        const [forBob] = await chatService.getUserConversations(bob._id);

        expect(forAlice.isPinned).toBe(true);
        expect(forBob.isPinned).toBe(false);
    });

    it('is idempotent, so pinning twice does not duplicate the entry', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);

        const stored = await Conversation.findById(convo._id);
        expect(stored.metadata.pinned).toHaveLength(1);
    });

    it('unpins again', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', false);

        const [forAlice] = await chatService.getUserConversations(alice._id);
        expect(forAlice.isPinned).toBe(false);
    });

    // Archiving used to hide a conversation from the list with nothing that
    // could bring it back.
    it('moves an archived conversation out of the inbox and into the archive', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'archived', true);

        const inbox = await chatService.getUserConversations(alice._id);
        const archive = await chatService.getUserConversations(alice._id, { archived: true });

        expect(inbox).toHaveLength(0);
        expect(archive).toHaveLength(1);
        expect(archive[0].isArchived).toBe(true);

        // And the other participant still sees it in their inbox.
        expect(await chatService.getUserConversations(bob._id)).toHaveLength(1);
    });

    it('unpins when archiving, so nothing is pinned inside the archive', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);
        const state = await chatService.setConversationFlag(convo._id, alice._id, 'archived', true);

        expect(state.isPinned).toBe(false);

        const stored = await Conversation.findById(convo._id);
        expect(stored.metadata.pinned).toHaveLength(0);
    });

    it('sorts pinned conversations first regardless of recency', async () => {
        const older = await Conversation.create({ participants: [alice._id, bob._id] });
        // Make the second conversation the more recent one.
        await Conversation.findByIdAndUpdate(convo._id, { updatedAt: new Date(Date.now() - 60000) });
        await Conversation.findByIdAndUpdate(older._id, { updatedAt: new Date() });

        await chatService.setConversationFlag(convo._id, alice._id, 'pinned', true);

        const list = await chatService.getUserConversations(alice._id);
        expect(list[0]._id.toString()).toBe(convo._id.toString());
    });

    it('refuses a flag it does not know', async () => {
        await expect(
            chatService.setConversationFlag(convo._id, alice._id, 'starred', true),
        ).rejects.toThrow(/Unknown conversation setting/);
    });

    it('refuses someone who is not in the conversation', async () => {
        const mallory = await makeUser('mallory');

        await expect(
            chatService.setConversationFlag(convo._id, mallory._id, 'pinned', true),
        ).rejects.toThrow(/Access denied/);
    });

    it('does not leak the raw metadata arrays to the client', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'muted', true);

        const [forAlice] = await chatService.getUserConversations(alice._id);
        expect(forAlice.metadata).toBeUndefined();
        expect(forAlice.isMuted).toBe(true);
    });

    afterEach(async () => {
        await Promise.all(
            Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
        );
    });
});
