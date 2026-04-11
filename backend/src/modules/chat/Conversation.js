'use strict';

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
        lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    },
    { timestamps: true },
);

// Ensure a conversation can only exist once between specific participants
// For 1-on-1 chats, sort the participants IDs to ensure uniqueness
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
