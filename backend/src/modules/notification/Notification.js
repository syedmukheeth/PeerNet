'use strict';

const mongoose = require('mongoose');

// Ensure models are registered for dynamic refPath population
require('../post/Post');
require('../comment/Comment');
require('../dscroll/Dscroll');

const notificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['like', 'comment', 'reply', 'follow', 'mention', 'message', 'system_warning'],
            required: true,
        },
        entityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityModel', default: null },
        entityModel: { type: String, enum: ['Post', 'Comment', 'Dscroll', 'Message', null], default: null },
        isRead: { type: Boolean, default: false },
        message: { type: String, default: '' },
    },
    { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
