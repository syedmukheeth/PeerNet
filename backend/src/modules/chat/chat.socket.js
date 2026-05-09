'use strict';

const chatService = require('./chat.service');
const User = require('../user/User');
const logger = require('../../config/logger');
const { getRedisOptional } = require('../../config/redis');

const ONLINE_TTL = 35; // seconds

module.exports = (io, socket) => {
    const userId = (socket.user.userId || socket.user.id || socket.user._id || '').toString();

    const markOnline = async () => {
        const redis = getRedisOptional();
        if (userId) {
            if (redis) await redis.setEx(`online:${userId}`, ONLINE_TTL, '1');
            
            // Atomic update and check if we need to broadcast
            const user = await User.findById(userId);
            if (user && !user.isOnline) {
                await User.findByIdAndUpdate(userId, { isOnline: true });
                io.emit('user_status_change', { userId, isOnline: true });
            }
        }
    };
    markOnline();

    // ── Room Management ──
    socket.on('join_conversation', (conversationId) => {
        socket.join(`chat:${conversationId}`);
        logger.info(`User ${userId} joined room: chat:${conversationId}`);
    });
    
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`chat:${conversationId}`);
    });

    // ── Messaging & Sync ──
    
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, body, mediaUrl, replyTo, clientSideId } = data;
            if (!conversationId || (!body && !mediaUrl)) return;

            const { message, conversation } = await chatService.saveMessage(conversationId, userId, { 
                body, mediaUrl, replyTo, clientSideId 
            });
            
            const payload = { ...message.toObject(), conversationId };
            
            // 1. Broadcast to active chat room
            io.to(`chat:${conversationId}`).emit('new_message', payload);

            // 2. Broadcast to all participants' user rooms to update their Sidebars
            if (conversation && conversation.participants) {
                conversation.participants.forEach(p => {
                    const pId = p._id ? p._id.toString() : p.toString();
                    io.to(`user:${pId}`).emit('update_conversation', conversation);
                    // Also emit new_message to user room for global notifs
                    io.to(`user:${pId}`).emit('new_message', payload);
                });
            }
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('mark_seen', async ({ conversationId }) => {
        try {
            await chatService.markAsSeen(conversationId, userId);
            // Broadcast to chat room so sender sees 'Seen' status update
            socket.to(`chat:${conversationId}`).emit('messages_seen', { conversationId, viewerId: userId });
        } catch (err) {
            logger.error('Error in mark_seen socket event', err);
        }
    });

    socket.on('edit_message', async ({ messageId, body, conversationId }) => {
        try {
            const message = await chatService.updateMessage(messageId, userId, body);
            io.to(`chat:${conversationId}`).emit('message_edited', message);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('delete_message', async ({ messageId, conversationId }) => {
        try {
            await chatService.deleteMessage(messageId, userId);
            io.to(`chat:${conversationId}`).emit('message_deleted', { messageId });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('react_message', async ({ messageId, emoji, conversationId }) => {
        try {
            const message = await chatService.reactToMessage(messageId, userId, emoji);
            io.to(`chat:${conversationId}`).emit('message_reacted', { 
                messageId, 
                reactions: message.reactions,
                senderId: userId 
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    // ── Typing Indicators ──
    socket.on('typing_start', (conversationId) => {
        socket.to(`chat:${conversationId}`).emit('user_typing_start', { userId, conversationId });
    });

    socket.on('typing_stop', (conversationId) => {
        socket.to(`chat:${conversationId}`).emit('user_typing_stop', { userId, conversationId });
    });

    // ── Maintenance ──
    socket.on('ping_online', () => markOnline());

    socket.on('disconnect', async () => {
        const redis = getRedisOptional();
        if (userId) {
            if (redis) await redis.del(`online:${userId}`);

            // Check if user has other active connections
            const userRoom = `user:${userId}`;
            const room = io.sockets.adapter.rooms.get(userRoom);
            
            // If room doesn't exist or only this socket was in it (already removed by socket.io)
            // Note: In disconnect handler, the socket might already be removed from room
            if (!room || room.size === 0) {
                await User.findByIdAndUpdate(userId, { 
                    isOnline: false, 
                    lastSeen: new Date() 
                });
                io.emit('user_status_change', { userId, isOnline: false, lastSeen: new Date() });
            }
        }
    });
};
