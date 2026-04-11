'use strict';

const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mediaUrl: { type: String, required: true },
        mediaPublicId: { type: String, required: true },
        mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
        viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
    },
    { timestamps: true },
);

// MongoDB TTL index: Mongo background task deletes documents after expiresAt
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
