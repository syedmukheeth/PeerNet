'use strict';

const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema(
    {
        follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

followerSchema.index({ follower: 1, following: 1 }, { unique: true });
followerSchema.index({ follower: 1 });
followerSchema.index({ following: 1 });

module.exports = mongoose.model('Follower', followerSchema);
