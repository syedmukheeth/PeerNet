'use strict';

const Conversation = require('./Conversation');
const Message = require('./Message');
const ApiError = require('../../utils/ApiError');
const { getRedisOptional } = require('../../config/redis');

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
const getUserConversations = async (userId) => {
    const conversations = await Conversation.find({ participants: userId })
        .populate('participants', 'username avatarUrl fullName isVerified isOnline')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

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
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
        throw new ApiError(403, 'Access denied');
    }

    const query = { conversation: conversationId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

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
    // 1. Check for duplicate if clientSideId provided
    if (clientSideId) {
        const existing = await Message.findOne({ clientSideId });
        if (existing) return { message: await existing.populate('sender', '_id username avatarUrl'), isDuplicate: true };
    }

    // 2. Create message
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

    // 3. Atomic update: Update lastMessage AND increment unreadCounts for all OTHER participants
    const updateQuery = {
        lastMessage: message._id,
        $inc: {}
    };

    // Find the conversation to get participants
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        await Message.findByIdAndDelete(message._id);
        throw new ApiError(404, 'Conversation not found');
    }

    // Increment unread count for everyone except sender
    conversation.participants.forEach(pId => {
        if (pId.toString() !== senderId.toString()) {
            updateQuery.$inc[`unreadCounts.${pId}`] = 1;
        }
    });

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

    message.body = body;
    message.isEdited = true;
    await message.save();
    return message.populate('sender', '_id username avatarUrl');
};

const deleteMessage = async (messageId, userId) => {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new ApiError(403, 'Message not found or access denied');
    
    await Message.deleteOne({ _id: messageId });
    return message;
};

const getUnreadCount = async (userId) => {
    const conversations = await Conversation.find({ participants: userId });
    return conversations.reduce((acc, conv) => {
        return acc + (conv.unreadCounts?.get(userId.toString()) || 0);
    }, 0);
};

module.exports = {
    getOrCreateConversation,
    getUserConversations,
    getMessages,
    saveMessage,
    markAsSeen,
    getUnreadCount,
    updateMessage,
    deleteMessage,
    reactToMessage
};
