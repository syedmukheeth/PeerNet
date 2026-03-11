'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, maxlength: 1000, default: '' },
        mediaUrl: { type: String, default: '' },
        mediaPublicId: { type: String, default: '' },
        isRead: { type: Boolean, default: false },
        isEdited: { type: Boolean, default: false },
    },
    { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
