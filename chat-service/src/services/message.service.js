'use strict';

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { uploadToCloudinary } = require('../utils/cloudinary.utils');
const ApiError = require('../utils/ApiError');
const { getRedis } = require('../config/redis');
const { checkToxicity, generateChatSuggestions } = require('../config/ai.config');

const getOrCreateConversation = async (userId, targetUserId) => {
    if (userId.toString() === targetUserId.toString()) {
        throw new ApiError(400, 'Cannot message yourself');
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [userId, targetUserId], $size: 2 },
    });

    if (!conversation) {
        conversation = await Conversation.create({ participants: [userId, targetUserId] });
    }

    return conversation;
};

const getUserConversations = async (userId) => {
    const redis = getRedis();
    const cacheKey = `user:${userId}:conversations`;

    // Try cache first
    let conversations;
    const cached = await redis.get(cacheKey);
    if (cached) {
        conversations = JSON.parse(cached);
    } else {
        // Cache miss — fetch from DB
        conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'username avatarUrl isVerified')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });
        
        // Convert to plain objects to allow adding properties
        conversations = conversations.map(c => c.toObject());

        // Cache the result for 1 minute (short cache for better consistency)
        await redis.setEx(cacheKey, 60, JSON.stringify(conversations));
    }

    // Always fetch LIVE online status and unread counts even if conversations are cached
    const enriched = await Promise.all(conversations.map(async (convo) => {
        const peer = convo.participants.find(p => p._id.toString() !== userId.toString());
        if (!peer) return convo;

        // Check online status in Redis
        const isOnline = await redis.get(`online:${peer._id.toString()}`);

        // Count unread messages from this peer in this conversation
        const unreadCount = await Message.countDocuments({
            conversation: convo._id,
            sender: peer._id,
            isRead: false
        });

        return {
            ...convo,
            isOnline: !!isOnline,
            unreadCount
        };
    }));

    return enriched;
};

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
        .sort({ createdAt: -1 })
        .limit(limit + 1);

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;
    return { data: results.reverse(), nextCursor, hasMore }; // return chronological order
};

const sendMessage = async (conversationId, senderId, { body }, file) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.participants.some((p) => p.toString() === senderId.toString())) {
        throw new ApiError(403, 'Access denied');
    }

    if (!body && !file) throw new ApiError(400, 'Message must have text or media');

    let mediaUrl = '';
    let mediaPublicId = '';

    if (file) {
        const result = await uploadToCloudinary(file.path, { folder: 'peernet/messages' });
        mediaUrl = result.secure_url;
        mediaPublicId = result.public_id;
    }

    const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        body: body || '',
        mediaUrl,
        mediaPublicId,
    });

    // Run toxicity check in the background for efficiency — could also be blocking if desired
    // For now, we'll let it be blocking so the user knows immediately if they are toxic
    if (body) {
        const score = await checkToxicity(body);
        if (score > 0.8) {
            await message.deleteOne();
            throw new ApiError(400, 'Message blocked due to toxic content');
        }
    }

    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
    });

    await message.populate('sender', 'username avatarUrl');
    
    // Invalidate conversation cache for all participants
    const redis = getRedis();
    for (const p of conversation.participants) {
        const pId = p.toString();
        await redis.del(`user:${pId}:conversations`);
        
        // Notify recipient real-time via Redis relay
        if (pId !== senderId.toString()) {
            await redis.publish('peernet:messages', JSON.stringify({
                recipient: pId,
                message: message
            }));
        }
    }

    return message;
};

const editMessage = async (messageId, userId, newBody) => {
    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    if (message.sender.toString() !== userId.toString()) {
        throw new ApiError(403, 'You can only edit your own messages');
    }

    if (Date.now() - new Date(message.createdAt).getTime() > 15 * 60 * 1000) {
        throw new ApiError(403, 'Message can only be edited within 15 minutes');
    }

    if (!newBody || newBody.trim() === '') {
        throw new ApiError(400, 'Message body cannot be empty');
    }

    message.body = newBody.trim();
    message.isEdited = true;
    await message.save();

    await message.populate('sender', 'username avatarUrl');
    
    // Update conversation if this is the last message
    await Conversation.findOneAndUpdate(
        { _id: message.conversation, lastMessage: messageId },
        { updatedAt: new Date() }
    );

    // Invalidate conversation cache
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
        const redis = getRedis();
        for (const p of conversation.participants) {
            const pId = p.toString();
            await redis.del(`user:${pId}:conversations`);
            
            // Notify real-time via Redis relay
            await redis.publish('peernet:messages', JSON.stringify({
                recipient: pId,
                type: 'MESSAGE_EDITED',
                message: message
            }));
        }
    }

    return message;
};

const deleteMessage = async (messageId, userId) => {
    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    if (message.sender.toString() !== userId.toString()) {
        throw new ApiError(403, 'You can only delete your own messages');
    }

    if (Date.now() - new Date(message.createdAt).getTime() > 15 * 60 * 1000) {
        throw new ApiError(403, 'Message can only be deleted within 15 minutes');
    }

    // Optional: if it has media, we could also call deleteFromCloudinary(message.mediaPublicId)
    // but we'll focus on just DB deletion for now to match timeline scope
    
    const conversationId = message.conversation;
    await message.deleteOne();

    // Re-evaluate lastMessage logic for the conversation sidebar
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage?.toString() === messageId.toString()) {
        const newLastMessage = await Message.findOne({ conversation: conversationId })
            .sort({ createdAt: -1 });

        conversation.lastMessage = newLastMessage ? newLastMessage._id : null;
        await conversation.save();
    }

    // Invalidate cache
    if (conversation) {
        const redis = getRedis();
        for (const p of conversation.participants) {
            const pId = p.toString();
            await redis.del(`user:${pId}:conversations`);
            
            // Notify real-time via Redis relay
            await redis.publish('peernet:messages', JSON.stringify({
                recipient: pId,
                type: 'MESSAGE_DELETED',
                messageId: messageId.toString(),
                conversationId: conversationId.toString()
            }));
        }
    }

    return true;
};

const getConversationById = (conversationId) =>
    Conversation.findById(conversationId).lean();

const markMessagesAsRead = async (conversationId, userId) => {
    // Mark messages in the conversation as read where sender is NOT the current user
    const result = await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, isRead: false },
        { $set: { isRead: true } }
    );
    return result;
};

const getSmartReplies = async (conversationId) => {
    // Fetch last 5 messages to provide context to AI
    const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'username')
        .sort({ createdAt: -1 })
        .limit(5);
    
    // Reverse for chronological order for the AI
    return generateChatSuggestions(messages.reverse());
};

module.exports = { getOrCreateConversation, getUserConversations, getMessages, sendMessage, editMessage, deleteMessage, getConversationById, markMessagesAsRead, getSmartReplies };

