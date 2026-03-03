'use strict';

const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        videoUrl: { type: String, required: true },
        videoPublicId: { type: String, required: true },
        thumbnailUrl: { type: String, default: '' },
        caption: { type: String, maxlength: 2200, default: '' },
        tags: [{ type: String, lowercase: true, trim: true }],
        duration: { type: Number, default: 0 }, // seconds
        likesCount: { type: Number, default: 0, min: 0 },
        commentsCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true },
);

reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reel', reelSchema);
