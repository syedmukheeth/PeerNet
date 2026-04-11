'use strict';

const chatService = require('./chat.service');

module.exports = (io, socket) => {
    
    // Join a specific chat room
    socket.on('join_room', (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.user.id} joined room: ${conversationId}`);
    });

    // Leave a specific chat room
    socket.on('leave_room', (conversationId) => {
        socket.leave(conversationId);
    });

    // Send a real-time message
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, body, mediaUrl } = data;
            
            // 1. Save to Database
            const message = await chatService.saveMessage(conversationId, socket.user.id, { body, mediaUrl });
            
            // 2. Emit to Room
            io.to(conversationId).emit('new_message', message);
            
            // 3. Emit notification to participants (handled separately or via this)
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    // Typing Indicators
    socket.on('typing_start', (conversationId) => {
        socket.to(conversationId).emit('user_typing_start', { userId: socket.user.id, conversationId });
    });

    socket.on('typing_stop', (conversationId) => {
        socket.to(conversationId).emit('user_typing_stop', { userId: socket.user.id, conversationId });
    });

    // Presence / Online Status
    // We could store online status in Redis here
};
