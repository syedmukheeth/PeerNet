'use strict';

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: false, index: true },
        dscroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Dscroll', required: false, index: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true, maxlength: 300 },
        likesCount: { type: Number, default: 0, min: 0 },
        isAiVerified: { type: Boolean, default: false },
        toxicityScore: { type: Number, default: 0 },
        parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    },
    { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ dscroll: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model('Comment', commentSchema);
