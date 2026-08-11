'use strict';

const Conversation = require('./Conversation');
const Message = require('./Message');
const ApiError = require('../../utils/ApiError');
const { getRedisOptional } = require('../../config/redis');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const logger = require('../../config/logger');

const EDIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

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

const getUserConversations = async (userId, { limit = CONVERSATION_PAGE_SIZE } = {}) => {
    // Bounded. This used to fetch every conversation a user had ever been part
    // of, fully populated, on every inbox load.
    const conversations = await Conversation.find({
        participants: userId,
        'metadata.deleted': { $ne: userId }
    })
        .populate('participants', 'username avatarUrl fullName isVerified isOnline')
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .limit(Math.min(limit, CONVERSATION_PAGE_SIZE));

    return conversations.map(conv => {
        const obj = conv.toObject();
        // Extract unread count from the Map
        obj.unreadCount = conv.unreadCounts?.get(userId.toString()) || 0;
        return obj;
    });
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
        .populate('replyTo', 'body sender') // Support for replies
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    
    return { data: results.reverse(), nextCursor, hasMore };
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
    if (message.replyTo) await message.populate('replyTo', 'body sender');

    return { message, conversation: updated };
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

    if (existingIndex > -1) {
        message.reactions.splice(existingIndex, 1);
    } else {
        message.reactions.push({ emoji, user: userId });
    }

    await message.save();
    return message.populate('sender', '_id username avatarUrl');
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
    deleteConversation
};
