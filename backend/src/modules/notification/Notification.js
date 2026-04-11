'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['like', 'comment', 'follow', 'mention', 'message'],
            required: true,
        },
        entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
        entityModel: { type: String, enum: ['Post', 'Comment', 'Dscroll', 'Message', null], default: null },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
