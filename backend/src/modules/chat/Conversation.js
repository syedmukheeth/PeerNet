'use strict';

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
        lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        
        // Track unread counts per user for high performance sidebar loading
        // Map of userId -> count
        unreadCounts: {
            type: Map,
            of: Number,
            default: {}
        },

        // Metadata for Pin/Mute/Archive (Backend persistence)
        metadata: {
            pinned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            muted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            archived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }
    },
    { timestamps: true },
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'metadata.pinned': 1 });
conversationSchema.index({ 'metadata.archived': 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
