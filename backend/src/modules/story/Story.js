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

// Lookup index for the hourly sweep in jobs/storyCleanup.job.js. Deliberately
// NOT a Mongo TTL index ({ expireAfterSeconds: 0 }) as it used to be: the TTL
// monitor deletes the document with no application hook, so it always won the
// race against the cron and every expired story's Cloudinary asset was
// orphaned permanently. user/User.js documents the same trap for guests.
storySchema.index({ expiresAt: 1 });
storySchema.index({ author: 1, createdAt: -1 });
// userPurge.service.js sweeps stories a deleted user had viewed.
storySchema.index({ viewers: 1 });

module.exports = mongoose.model('Story', storySchema);
