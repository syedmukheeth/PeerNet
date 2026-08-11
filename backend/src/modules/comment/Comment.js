'use strict';

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true, maxlength: 300 },
        likesCount: { type: Number, default: 0, min: 0 },
        isAiVerified: { type: Boolean, default: false },
        toxicityScore: { type: Number, default: 0 },
        parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    },
    { timestamps: true },
);

// author has no single-field index from its field options, and the user purge
// queries by it directly.
commentSchema.index({ author: 1 });
commentSchema.index({ post: 1, createdAt: -1 });
// Supports the 5-second duplicate-comment check, which filters on author, post
// and createdAt together on every single comment posted.
commentSchema.index({ author: 1, post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model('Comment', commentSchema);
