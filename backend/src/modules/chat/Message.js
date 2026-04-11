'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        body: { type: String, default: '' },
        mediaUrl: { type: String, default: '' },
        mediaPublicId: { type: String, default: '' },
        status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    },
    { timestamps: true },
);

module.exports = mongoose.model('Message', messageSchema);
