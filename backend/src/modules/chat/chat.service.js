'use strict';

const Conversation = require('./Conversation');
const Message = require('./Message');
const ApiError = require('../../utils/ApiError');
const { getRedisOptional } = require('../../config/redis');

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

    return conversation.populate('participants', 'username avatarUrl fullName isVerified');
};

const getUserConversations = async (userId) => {
    const conversations = await Conversation.find({ participants: userId })
        .populate('participants', 'username avatarUrl fullName isVerified')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

    // Inject unread counts for each conversation
    const mapped = await Promise.all(
        conversations.map(async (conv) => {
            const count = await Message.countDocuments({
                conversation: conv._id,
                sender: { $ne: userId },
                status: { $ne: 'seen' },
            });
            const obj = conv.toObject();
            obj.unreadCount = count;
            return obj;
        })
    );

    return mapped;
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
    
    return { data: results.reverse(), nextCursor, hasMore };
};

const saveMessage = async (conversationId, senderId, { body, mediaUrl, mediaPublicId, _tempId }) => {
    // 🚀 Performance Optimization: Skip findById if we can verify participancy via updateOne safely
    // Or just create the message directly if the client was able to hit the route (auth handles it mostly)
    
    // Create message and update conversation in parallel or sequential optimization
    const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        body: body || '',
        mediaUrl: mediaUrl || '',
        mediaPublicId: mediaPublicId || '',
        status: 'sent',
    });

    // Update conversation's last message and updatedAt without a prior lookup
    // { participants: senderId } ensures the sender is actually in the room
    const updated = await Conversation.findOneAndUpdate(
        { _id: conversationId, participants: senderId },
        { lastMessage: message._id },
        { new: true }
    );

    if (!updated) {
        // Fallback for security/cleanup
        await Message.findByIdAndDelete(message._id);
        throw new ApiError(403, 'Access denied or conversation not found');
    }

    await message.populate('sender', '_id username avatarUrl');
    return { message, conversation: updated };
};

const markAsSeen = async (conversationId, userId) => {
    const result = await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, status: { $ne: 'seen' } },
        { status: 'seen' }
    );

    // Broadcast sync event so all client sessions refresh their unread counts
    const redis = getRedisOptional();
    if (redis) {
        await redis.publish('peernet:messages', JSON.stringify({
            recipient: userId.toString(),
            type: 'UNREAD_COUNT_SYNC'
        }));
    }

    return result;
};

const getUnreadCount = async (userId) => {
    const userConversations = await Conversation.find({ participants: userId }).select('_id').lean();
    const convoIds = userConversations.map(c => c._id);
    
    return Message.countDocuments({
        conversation: { $in: convoIds },
        sender: { $ne: userId },
        status: { $ne: 'seen' }
    });
};

const updateMessage = async (messageId, userId, body) => {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new ApiError(403, 'Message not found or access denied');

    message.body = body;
    await message.save();
    return message.populate('sender', '_id username avatarUrl');
};

const deleteMessage = async (messageId, userId) => {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new ApiError(403, 'Message not found or access denied');
    
    await Message.deleteOne({ _id: messageId });
    return message;
};

module.exports = {
    getOrCreateConversation,
    getUserConversations,
    getMessages,
    saveMessage,
    markAsSeen,
    getUnreadCount,
    updateMessage,
    deleteMessage
};
