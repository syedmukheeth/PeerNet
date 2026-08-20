// Reactions are stored one row per person per emoji, and the client needs them
// grouped with a "is one of these mine" answer. That answer is per viewer, so
// the same message shapes differently for two people - which is exactly the
// kind of thing that broke silently before: the client read `r.me`, a field the
// API never sent, so nobody's own reaction ever highlighted.
require('./setup');

const mongoose = require('mongoose');

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const Conversation = require('../src/modules/chat/Conversation');
const Message = require('../src/modules/chat/Message');
const chatService = require('../src/modules/chat/chat.service');
const notificationService = require('../src/modules/notification/notification.service');
const Notification = require('../src/modules/notification/Notification');

const makeUser = (username) => User.create({
    username,
    fullName: 'Some One',
    email: `${username}@example.com`,
    passwordHash: 'x'.repeat(20),
});

describe('chat.service reactions', () => {
    let alice;
    let bob;
    let convo;
    let message;

    beforeEach(async () => {
        alice = await makeUser('alice');
        bob = await makeUser('bob');
        convo = await Conversation.create({ participants: [alice._id, bob._id] });
        message = await Message.create({
            conversation: convo._id,
            sender: alice._id,
            body: 'hello',
        });
    });

    const readAs = async (userId) => {
        const { data } = await chatService.getMessages(convo._id, userId, {});
        return data.find((m) => m._id.toString() === message._id.toString());
    };

    it('groups the same emoji from two people into one entry with a count', async () => {
        await chatService.reactToMessage(message._id, alice._id, '🔥');
        await chatService.reactToMessage(message._id, bob._id, '🔥');

        const seen = await readAs(alice._id);
        expect(seen.reactions).toHaveLength(1);
        expect(seen.reactions[0]).toMatchObject({ emoji: '🔥', count: 2 });
    });

    // The bug this whole shape exists to fix.
    it('marks a reaction as mine only for the person who left it', async () => {
        await chatService.reactToMessage(message._id, alice._id, '❤️');

        const forAlice = await readAs(alice._id);
        const forBob = await readAs(bob._id);

        expect(forAlice.reactions[0].me).toBe(true);
        expect(forBob.reactions[0].me).toBe(false);
    });

    it('names who reacted, so the chip can explain itself', async () => {
        await chatService.reactToMessage(message._id, alice._id, '😂');
        await chatService.reactToMessage(message._id, bob._id, '😂');

        const seen = await readAs(alice._id);
        expect(seen.reactions[0].users.sort()).toEqual(['alice', 'bob']);
    });

    it('toggles a reaction off when the same person sends it again', async () => {
        await chatService.reactToMessage(message._id, alice._id, '👍');
        const after = await chatService.reactToMessage(message._id, alice._id, '👍');

        expect(after.reactions).toHaveLength(0);
    });

    it('keeps different emoji from one person as separate entries', async () => {
        await chatService.reactToMessage(message._id, alice._id, '👍');
        await chatService.reactToMessage(message._id, alice._id, '🔥');

        const seen = await readAs(alice._id);
        expect(seen.reactions).toHaveLength(2);
        expect(seen.reactions.every((r) => r.me)).toBe(true);
    });

    it('refuses a reaction from someone outside the conversation', async () => {
        const mallory = await makeUser('mallory');

        await expect(
            chatService.reactToMessage(message._id, mallory._id, '🔥'),
        ).rejects.toThrow(/Access denied/);
    });
});

describe('chat.service reaction notifications', () => {
    let alice;
    let bob;
    let convo;
    let message;

    beforeEach(async () => {
        alice = await makeUser('alice');
        bob = await makeUser('bob');
        convo = await Conversation.create({ participants: [alice._id, bob._id] });
        // Alice wrote it, so Bob reacting is what should notify her.
        message = await Message.create({
            conversation: convo._id,
            sender: alice._id,
            body: 'hello',
        });
    });

    it('tells the author when someone reacts, and which emoji it was', async () => {
        await chatService.reactToMessage(message._id, bob._id, '🔥');

        const notifs = await Notification.find({ recipient: alice._id, type: 'reaction' });
        expect(notifs).toHaveLength(1);
        expect(notifs[0].message).toBe('🔥');
        expect(notifs[0].entityModel).toBe('Message');
    });

    it('withdraws the notification when the reaction is taken back', async () => {
        await chatService.reactToMessage(message._id, bob._id, '🔥');
        await chatService.reactToMessage(message._id, bob._id, '🔥');

        expect(await Notification.countDocuments({ recipient: alice._id, type: 'reaction' })).toBe(0);
    });

    it('does not notify you about your own reaction', async () => {
        await chatService.reactToMessage(message._id, alice._id, '🔥');

        expect(await Notification.countDocuments({ type: 'reaction' })).toBe(0);
    });

    // Mute has to mean the whole thread. Suppressing only the toast while still
    // writing the row would put a muted conversation back on the notifications
    // screen anyway.
    it('stays silent when the author has muted the conversation', async () => {
        await chatService.setConversationFlag(convo._id, alice._id, 'muted', true);
        await chatService.reactToMessage(message._id, bob._id, '🔥');

        expect(await Notification.countDocuments({ recipient: alice._id, type: 'reaction' })).toBe(0);
    });

    it('links back to the conversation the message is in', async () => {
        await chatService.reactToMessage(message._id, bob._id, '🔥');

        const { data } = await notificationService.getNotifications(alice._id, { limit: 10 });
        const row = data.find((n) => n.type === 'reaction');

        expect(row.targetUrl).toBe(`/messages/${convo._id.toString()}`);
    });

    afterEach(async () => {
        await Promise.all(
            Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
        );
    });
});

describe('chat.service reply quotes', () => {
    let alice;
    let bob;
    let convo;

    beforeEach(async () => {
        alice = await makeUser('alice');
        bob = await makeUser('bob');
        convo = await Conversation.create({ participants: [alice._id, bob._id] });
    });

    // The quote used to populate `sender` as a bare id, so it could not name
    // the person being answered, and carried no media fields, so a photo quoted
    // as the literal word "Media".
    it('carries the quoted author and media kind, not just the body', async () => {
        const original = await Message.create({
            conversation: convo._id,
            sender: alice._id,
            body: '',
            mediaUrl: 'https://example.com/a.jpg',
            mediaType: 'image',
        });

        await chatService.saveMessage(convo._id, bob._id, {
            body: 'nice one',
            replyTo: original._id,
        });

        const { data } = await chatService.getMessages(convo._id, bob._id, {});
        const reply = data.find((m) => m.body === 'nice one');

        expect(reply.replyTo.sender.username).toBe('alice');
        expect(reply.replyTo.mediaType).toBe('image');
    });

    afterEach(async () => {
        await Promise.all(
            Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
        );
    });
});
