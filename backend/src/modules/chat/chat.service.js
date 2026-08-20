'use strict';

const Conversation = require('./Conversation');
const Message = require('./Message');
const ApiError = require('../../utils/ApiError');
const { getRedisOptional } = require('../../config/redis');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const logger = require('../../config/logger');
const notificationService = require('../notification/notification.service');

const EDIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

// What a reply quote needs in order to render: who wrote it, what it said, and
// enough about any attachment to describe it. `sender` alone came back as a
// bare id, so a quote could not name the person it was quoting.
const REPLY_FIELDS = 'body sender mediaType mediaUrl';
const REPLY_POPULATE = {
    path: 'replyTo',
    select: REPLY_FIELDS,
    populate: { path: 'sender', select: 'username' },
};

/**
 * Shape a message for the client.
 *
 * Reactions are stored one row per person per emoji, which is the right shape
 * to write but the wrong one to render: the client was left to aggregate them
 * and had no way to know whether one of them was yours. It guessed with
 * `r.me`, a field the API never sent, so your own reaction chip never lit up.
 *
 * This groups them by emoji and answers the three questions a bubble actually
 * asks: which emoji, how many, and is one of them mine.
 */
const shapeMessage = (message, userId) => {
    const obj = message.toObject ? message.toObject() : { ...message };
    const me = userId?.toString();

    const byEmoji = new Map();
    (obj.reactions || []).forEach((r) => {
        if (!r?.emoji) return;
        const reactor = r.user && typeof r.user === 'object' ? r.user : null;
        const reactorId = (reactor?._id || r.user)?.toString();

        if (!byEmoji.has(r.emoji)) {
            byEmoji.set(r.emoji, { emoji: r.emoji, count: 0, me: false, users: [] });
        }
        const group = byEmoji.get(r.emoji);
        group.count += 1;
        if (reactorId === me) group.me = true;
        // Names for the "who reacted" tooltip. Capped, because a popular
        // message should not ship a hundred usernames per emoji.
        if (reactor?.username && group.users.length < 8) group.users.push(reactor.username);
    });

    obj.reactions = [...byEmoji.values()];
    return obj;
};

/**
 * Load a conversation and assert the caller is one of its participants.
 * Every read and every mutation has to go through this. Skipping it on any
 * single path is enough to expose every conversation in the database, because
 * the ids are guessable and the routes only check that you are logged in.
 */
const assertParticipant = async (conversationId, userId) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
        throw new ApiError(403, 'Access denied');
    }
    return conversation;
};

/**
 * Get or create a 1-on-1 conversation
 */
const getOrCreateConversation = async (userId, targetUserId) => {
    if (userId.toString() === targetUserId.toString()) {
        throw new ApiError(400, 'Cannot message yourself');
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [userId, targetUserId], $size: 2 },
    });

    if (!conversation) {
        conversation = await Conversation.create({ 
            participants: [userId, targetUserId],
            unreadCounts: { [userId]: 0, [targetUserId]: 0 }
        });
    }

    return conversation.populate('participants', 'username avatarUrl fullName isVerified');
};

/**
 * Get all conversations for a user with optimized unread counts
 */
const CONVERSATION_PAGE_SIZE = 50;

const getUserConversations = async (userId, { limit = CONVERSATION_PAGE_SIZE, archived = false } = {}) => {
    // Bounded. This used to fetch every conversation a user had ever been part
    // of, fully populated, on every inbox load.
    //
    // Pin, mute and archive are per participant, not per conversation: you can
    // pin a thread the other person has not. That is why each lives as an array
    // of user ids under metadata rather than as a boolean on the document.
    const query = {
        participants: userId,
        'metadata.deleted': { $ne: userId },
        'metadata.archived': archived ? userId : { $ne: userId }
    };

    const conversations = await Conversation.find(query)
        .populate('participants', 'username avatarUrl fullName isVerified isOnline')
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .limit(Math.min(limit, CONVERSATION_PAGE_SIZE));

    const holds = (list, id) => (list || []).some((u) => u.toString() === id.toString());

    return conversations
        .map(conv => {
            const obj = conv.toObject();
            // Extract unread count from the Map
            obj.unreadCount = conv.unreadCounts?.get(userId.toString()) || 0;

            // Resolved for the asking user, so the client never has to reason
            // about the arrays.
            obj.isPinned = holds(conv.metadata?.pinned, userId);
            obj.isMuted = holds(conv.metadata?.muted, userId);
            obj.isArchived = holds(conv.metadata?.archived, userId);

            delete obj.metadata;
            return obj;
        })
        // Pinned first, then most recent. Sorting here rather than on the
        // client means paging cannot push a pinned thread off the list.
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
            || new Date(b.updatedAt) - new Date(a.updatedAt));
};

/**
 * Pin, mute or archive a conversation for one participant.
 *
 * These three were frontend-only fakes living in localStorage: they did not
 * survive a different browser, mute had no effect on anything, and an archived
 * conversation was simply filtered out of the list with no way to see it again.
 * The schema always had somewhere to put them.
 */
const CONVERSATION_FLAGS = ['pinned', 'muted', 'archived'];

/**
 * Has this participant muted the thread?
 *
 * Mute has to mean the whole conversation. Suppressing only the in-app toast
 * while still writing a notification row would put the muted thread straight
 * back on the notifications screen.
 */
const isMutedFor = async (conversationId, userId) => {
    const conversation = await Conversation.findById(conversationId).select('metadata.muted').lean();
    return (conversation?.metadata?.muted || [])
        .some((u) => u.toString() === userId.toString());
};

const setConversationFlag = async (conversationId, userId, flag, value) => {
    if (!CONVERSATION_FLAGS.includes(flag)) {
        throw new ApiError(400, 'Unknown conversation setting');
    }

    await assertParticipant(conversationId, userId);

    const update = value
        ? { $addToSet: { [`metadata.${flag}`]: userId } }
        : { $pull: { [`metadata.${flag}`]: userId } };

    const conversation = await Conversation.findByIdAndUpdate(conversationId, update, { new: true });

    // Archiving a thread should take it out of the way entirely, so it stops
    // being pinned at the same time.
    if (flag === 'archived' && value) {
        await Conversation.findByIdAndUpdate(conversationId, {
            $pull: { 'metadata.pinned': userId }
        });
    }

    const holds = (list) => (list || []).some((u) => u.toString() === userId.toString());
    return {
        _id: conversation._id,
        isPinned: flag === 'archived' && value ? false : holds(conversation.metadata?.pinned),
        isMuted: holds(conversation.metadata?.muted),
        isArchived: holds(conversation.metadata?.archived)
    };
};

/**
 * Get message history with cursor-based pagination
 */
const getMessages = async (conversationId, userId, { limit = 30, cursor = null }) => {
    const conversation = await assertParticipant(conversationId, userId);

    const query = { conversation: conversationId };
    
    // Hide messages sent before the user cleared the chat
    const cleared = conversation.clearedBy?.find(c => c.user.toString() === userId.toString());
    if (cleared) {
        query.createdAt = { $gt: cleared.clearedAt };
    }

    if (cursor) {
        if (query.createdAt) {
            query.createdAt.$lt = new Date(cursor);
        } else {
            query.createdAt = { $lt: new Date(cursor) };
        }
    }

    const messages = await Message.find(query)
        .populate('sender', 'username avatarUrl')
        .populate(REPLY_POPULATE)
        .populate('reactions.user', 'username')
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
        data: results.reverse().map((m) => shapeMessage(m, userId)),
        nextCursor,
        hasMore,
    };
};

/**
 * Save a new message with unread count increments and idempotency
 */
const saveMessage = async (conversationId, senderId, { body, mediaUrl, mediaType, replyTo, clientSideId }) => {
    // 1. Only participants may write into a conversation
    const conversation = await assertParticipant(conversationId, senderId);

    // 2. Check for duplicate if clientSideId provided. Scoped to the sender:
    // the id comes from the client, so a global lookup would hand one user
    // another user's message body just by reusing their id.
    if (clientSideId) {
        const existing = await Message.findOne({ clientSideId, sender: senderId });
        if (existing) return { message: await existing.populate('sender', '_id username avatarUrl'), isDuplicate: true };
    }

    // 3. Create message
    const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        body: body || '',
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'none',
        replyTo: replyTo || null,
        clientSideId,
        status: 'sent',
    });

    // 4. Atomic update: Update lastMessage AND increment unreadCounts for all OTHER participants
    const updateQuery = {
        lastMessage: message._id,
        // Un-delete the conversation for everyone (if it was deleted)
        $pull: { 'metadata.deleted': { $in: conversation.participants } },
    };

    // Increment unread count for everyone except sender
    const increments = {};
    conversation.participants.forEach(pId => {
        if (pId.toString() !== senderId.toString()) {
            increments[`unreadCounts.${pId}`] = 1;
        }
    });
    // Mongo rejects an empty $inc, which a self-only conversation would produce
    if (Object.keys(increments).length > 0) updateQuery.$inc = increments;

    const updated = await Conversation.findByIdAndUpdate(conversationId, updateQuery, { new: true })
        .populate('participants', 'username avatarUrl');

    await message.populate('sender', '_id username avatarUrl');
    // The quote needs the author's name and the attachment kind, not just a
    // body string and a bare id.
    if (message.replyTo) await message.populate(REPLY_POPULATE);

    return { message: shapeMessage(message, senderId), conversation: updated };
};

/**
 * Mark messages as seen and reset unread counter
 */
const markAsSeen = async (conversationId, userId) => {
    await assertParticipant(conversationId, userId);

    // Reset unread count for this user in the conversation
    await Conversation.findByIdAndUpdate(conversationId, {
        [`unreadCounts.${userId}`]: 0
    });

    const result = await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, status: { $ne: 'seen' } },
        { status: 'seen' }
    );

    // Notify other participants that messages were seen (Read Receipts)
    const redis = getRedisOptional();
    if (redis) {
        await redis.publish('peernet:messages', JSON.stringify({
            conversationId: conversationId.toString(),
            viewerId: userId.toString(),
            type: 'MESSAGES_SEEN'
        }));
    }

    return result;
};

/**
 * Toggle reaction on a message
 */
const reactToMessage = async (messageId, userId, emoji) => {
    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');
    await assertParticipant(message.conversation, userId);

    const existingIndex = message.reactions.findIndex(r =>
        r.emoji === emoji && r.user.toString() === userId.toString()
    );

    const removing = existingIndex > -1;

    if (removing) {
        message.reactions.splice(existingIndex, 1);
    } else {
        message.reactions.push({ emoji, user: userId });
    }

    /*
     * Tell the author someone reacted.
     *
     * Reacting to a message told nobody anything: the reaction landed silently
     * and the person who wrote the message only found out by scrolling back to
     * it. Taking the reaction back withdraws the notification, the same way
     * unliking a post does.
     *
     * Not for your own message, and not into a conversation the author has
     * muted: muting a thread has to mean the whole thread, not just the toast.
     */
    const authorId = (message.sender?._id || message.sender).toString();
    if (authorId !== userId.toString()) {
        const filter = {
            recipient: authorId,
            sender: userId,
            entityId: message._id,
            entityModel: 'Message',
            type: 'reaction',
        };

        if (removing) {
            await notificationService.removeNotification(filter);
        } else if (!(await isMutedFor(message.conversation, authorId))) {
            await notificationService.createNotification({ ...filter, message: emoji });
        }
    }

    await message.save();
    await message.populate([
        { path: 'sender', select: '_id username avatarUrl' },
        { path: 'reactions.user', select: 'username' },
        REPLY_POPULATE,
    ]);
    // Shaped for the person who reacted. Everyone else re-reads the thread off
    // the message_reacted event, which resolves `me` from their own side.
    return shapeMessage(message, userId);
};

const updateMessage = async (messageId, userId, body) => {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new ApiError(403, 'Message not found or access denied');

    const timeDiff = Date.now() - new Date(message.createdAt).getTime();
    if (timeDiff > EDIT_WINDOW) {
        throw new ApiError(400, 'Messages can only be edited within 15 minutes');
    }

    message.body = body;
    message.isEdited = true;
    await message.save();
    return message.populate('sender', '_id username avatarUrl');
};

const deleteMessage = async (messageId, userId) => {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new ApiError(403, 'Message not found or access denied');
    
    const timeDiff = Date.now() - new Date(message.createdAt).getTime();
    if (timeDiff > EDIT_WINDOW) {
        throw new ApiError(400, 'Messages can only be deleted within 15 minutes');
    }

    await Message.deleteOne({ _id: messageId });

    // Free the attachment. Nothing else ever deleted it, so every deleted media
    // message leaked its Cloudinary asset permanently.
    if (message.mediaPublicId) {
        await deleteFromCloudinary(
            message.mediaPublicId,
            message.mediaType === 'video' ? 'video' : 'image',
        ).catch((err) => logger.warn(`Failed to delete chat media: ${err.message}`));
    }

    // Repoint the conversation's lastMessage. Deleting the newest message left
    // the reference dangling, and populate('lastMessage') then resolved it to
    // null, which the inbox renders as an empty conversation.
    const conversation = await Conversation.findById(message.conversation).select('lastMessage');
    if (conversation?.lastMessage?.toString() === messageId.toString()) {
        const previous = await Message.findOne({ conversation: message.conversation })
            .sort({ createdAt: -1 })
            .select('_id')
            .lean();
        conversation.lastMessage = previous?._id || null;
        await conversation.save();
    }

    return message;
};

const getUnreadCount = async (userId) => {
    // Projects only the counter map instead of hydrating full documents with
    // their participants and last message just to sum one number.
    const conversations = await Conversation.find({
        participants: userId,
        'metadata.deleted': { $ne: userId }
    })
        .select('unreadCounts')
        .lean();

    const key = userId.toString();
    return conversations.reduce((acc, conv) => acc + (conv.unreadCounts?.[key] || 0), 0);
};

/**
 * Delete a conversation for a user (hides it and clears history for them)
 */
const deleteConversation = async (conversationId, userId) => {
    const conversation = await assertParticipant(conversationId, userId);

    // Update clearedBy array
    const clearedIndex = conversation.clearedBy?.findIndex(c => c.user.toString() === userId.toString());
    if (clearedIndex > -1) {
        conversation.clearedBy[clearedIndex].clearedAt = new Date();
    } else {
        if (!conversation.clearedBy) conversation.clearedBy = [];
        conversation.clearedBy.push({ user: userId, clearedAt: new Date() });
    }

    // Mark as deleted in metadata so it is hidden from the inbox
    if (!conversation.metadata) conversation.metadata = {};
    if (!conversation.metadata.deleted) conversation.metadata.deleted = [];
    if (!conversation.metadata.deleted.includes(userId)) {
        conversation.metadata.deleted.push(userId);
    }

    await conversation.save();
    return conversation;
};

module.exports = {
    assertParticipant,
    getOrCreateConversation,
    getUserConversations,
    getMessages,
    saveMessage,
    markAsSeen,
    getUnreadCount,
    updateMessage,
    deleteMessage,
    reactToMessage,
    deleteConversation,
    setConversationFlag,
    CONVERSATION_FLAGS
};
