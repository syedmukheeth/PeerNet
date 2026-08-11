// Runs against a real in-memory MongoDB. Every one of these paths was
// previously reachable by any authenticated user against any conversation in
// the database, so the point of the suite is to prove the participant check
// actually holds rather than that the code calls a function named like a check.
require('./setup');

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const Conversation = require('../src/modules/chat/Conversation');
const Message = require('../src/modules/chat/Message');
const chatService = require('../src/modules/chat/chat.service');

const makeUser = (username) =>
    User.create({
        username,
        email: `${username}@peernet.app`,
        fullName: username,
        passwordHash: 'hash',
    });

describe('chat.service authorization', () => {
    let alice;
    let bob;
    let mallory;
    let conversation;

    beforeEach(async () => {
        [alice, bob, mallory] = await Promise.all([
            makeUser('alice'),
            makeUser('bob'),
            makeUser('mallory'),
        ]);

        conversation = await Conversation.create({
            participants: [alice._id, bob._id],
            unreadCounts: { [alice._id]: 0, [bob._id]: 0 },
        });
    });

    const expectForbidden = async (promise) => {
        await expect(promise).rejects.toMatchObject({ statusCode: 403 });
    };

    it('lets a participant send a message', async () => {
        const { message } = await chatService.saveMessage(conversation._id, alice._id, {
            body: 'hello bob',
        });
        expect(message.body).toBe('hello bob');

        const stored = await Conversation.findById(conversation._id);
        expect(stored.unreadCounts.get(bob._id.toString())).toBe(1);
    });

    it('refuses a message from a non-participant and writes nothing', async () => {
        await expectForbidden(
            chatService.saveMessage(conversation._id, mallory._id, { body: 'injected' }),
        );
        expect(await Message.countDocuments({})).toBe(0);
    });

    it('refuses to read messages for a non-participant', async () => {
        await chatService.saveMessage(conversation._id, alice._id, { body: 'private' });
        await expectForbidden(chatService.getMessages(conversation._id, mallory._id, {}));
    });

    it('refuses markAsSeen from a non-participant and leaves the unread count intact', async () => {
        await chatService.saveMessage(conversation._id, alice._id, { body: 'unread' });
        await expectForbidden(chatService.markAsSeen(conversation._id, mallory._id));

        const stored = await Conversation.findById(conversation._id);
        expect(stored.unreadCounts.get(bob._id.toString())).toBe(1);
    });

    it('refuses a reaction from a non-participant', async () => {
        const { message } = await chatService.saveMessage(conversation._id, alice._id, {
            body: 'react to me',
        });
        await expectForbidden(chatService.reactToMessage(message._id, mallory._id, '🔥'));

        const stored = await Message.findById(message._id);
        expect(stored.reactions).toHaveLength(0);
    });

    it('refuses deleteConversation from a non-participant', async () => {
        await expectForbidden(chatService.deleteConversation(conversation._id, mallory._id));
    });

    it('scopes clientSideId idempotency to the sender', async () => {
        const clientSideId = 'shared-id-42';
        await chatService.saveMessage(conversation._id, alice._id, {
            body: "alice's secret",
            clientSideId,
        });

        // Bob reusing the same client id must create his own message rather than
        // being handed Alice's back as a "duplicate".
        const { message, isDuplicate } = await chatService.saveMessage(conversation._id, bob._id, {
            body: 'bob writes his own',
            clientSideId,
        });

        expect(isDuplicate).toBeUndefined();
        expect(message.body).toBe('bob writes his own');
    });

    it('does not reject a send when the sender is the only participant', async () => {
        // An empty $inc is a Mongo error, which a self-conversation used to hit.
        const solo = await Conversation.create({ participants: [alice._id] });
        const { message } = await chatService.saveMessage(solo._id, alice._id, { body: 'note' });
        expect(message.body).toBe('note');
    });
});
