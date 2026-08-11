'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        body: { type: String, default: '' },
        
        // Advanced Features
        replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
        reactions: [
            {
                emoji: { type: String, required: true },
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
            }
        ],
        
        isEdited: { type: Boolean, default: false },
        
        // Media Support
        mediaUrl: { type: String, default: '' },
        mediaPublicId: { type: String, default: '' },
        mediaType: { type: String, enum: ['image', 'video', 'audio', 'file', 'none'], default: 'none' },

        status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },

        // Idempotency: Prevent duplicate messages from retries.
        // Uniqueness is scoped to the sender by the compound index below, not by
        // a field-level `unique`, because this value is chosen by the client:
        // a global constraint let one user's id collide with another's, which
        // both leaked the other user's message body back as a "duplicate" and
        // silently dropped legitimate messages on an accidental collision.
        clientSideId: { type: String, sparse: true }
    },
    { timestamps: true },
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index(
    { sender: 1, clientSideId: 1 },
    { unique: true, partialFilterExpression: { clientSideId: { $type: 'string' } } },
);
// userPurge.service.js sweeps reactions left by a deleted user.
messageSchema.index({ 'reactions.user': 1 });

module.exports = mongoose.model('Message', messageSchema);
