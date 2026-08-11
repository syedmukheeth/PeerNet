'use strict';

const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    },
    { timestamps: true },
);

savedPostSchema.index({ user: 1, post: 1 }, { unique: true });
savedPostSchema.index({ user: 1, createdAt: -1 });
// Deleting a post clears every save of it, and the user purge does the same in
// bulk. Neither had an index to work from.
savedPostSchema.index({ post: 1 });

module.exports = mongoose.model('SavedPost', savedPostSchema);
