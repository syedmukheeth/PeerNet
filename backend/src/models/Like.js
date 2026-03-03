'use strict';

const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
        targetModel: { type: String, enum: ['Post', 'Comment', 'Reel'], required: true },
    },
    { timestamps: true },
);

// Enforce uniqueness: one like per user per target
likeSchema.index({ user: 1, targetId: 1, targetModel: 1 }, { unique: true });
likeSchema.index({ targetId: 1 });

module.exports = mongoose.model('Like', likeSchema);
