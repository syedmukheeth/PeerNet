'use strict';

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mediaUrl: { type: String, required: true },
        mediaPublicId: { type: String, required: true },
        mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
        caption: { type: String, maxlength: 2200, default: '' },
        location: { type: String, maxlength: 100, default: '' },
        tags: [{ type: String, lowercase: true, trim: true }],
        likesCount: { type: Number, default: 0, min: 0 },
        commentsCount: { type: Number, default: 0, min: 0 },
        isArchived: { type: Boolean, default: false },
    },
    { timestamps: true },
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
