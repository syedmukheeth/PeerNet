'use strict';

const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mediaUrl: { 
            type: String, 
            required: function() { return this.mediaType !== 'text'; } 
        },
        mediaPublicId: { 
            type: String, 
            required: function() { return this.mediaType !== 'text'; } 
        },
        mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
        content: { type: String, trim: true },
        backgroundColor: { type: String, default: '#000000' },
        
        // Premium Text Story metadata
        fontFamily: { type: String, default: 'Modern' },
        textAlign: { type: String, default: 'center' },
        isBold: { type: Boolean, default: true },
        textColor: { type: String, default: '#ffffff' },

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
