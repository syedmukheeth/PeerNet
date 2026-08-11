'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            match: [/^[a-z0-9_.]+$/, 'Username can only contain letters, numbers, dots and underscores'],
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        bio: { type: String, maxlength: 150, default: '' },
        avatarUrl: { type: String, default: '' },
        avatarPublicId: { type: String, default: '' },
        website: { type: String, default: '' },
        role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
        status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
        lastLogin: { type: Date, default: Date.now },
        isVerified: { type: Boolean, default: false },
        isPrivate: { type: Boolean, default: false },
        followersCount: { type: Number, default: 0, min: 0 },
        followingCount: { type: Number, default: 0, min: 0 },
        postsCount: { type: Number, default: 0, min: 0 },
        categoryAffinity: { type: Map, of: Number, default: {} },
        isOnline: { type: Boolean, default: false },
        lastSeen: { type: Date, default: Date.now },

        // Guest sessions are temporary. expiresAt is set 24h ahead at creation
        // and swept by jobs/guestCleanup.job.js.
        isGuest: { type: Boolean, default: false },
        expiresAt: { type: Date, default: null },
    },
    { timestamps: true },
);

// Compound text index for search
userSchema.index({ username: 'text', fullName: 'text' });

// Lookup index for the guest sweep. Deliberately NOT a Mongo TTL index
// ({ expireAfterSeconds: 0 }) the way Story does it: the TTL monitor deletes the
// document with no application hook, which would orphan every post, comment,
// like and follow the guest created and permanently leave the admins it
// auto-followed with an inflated followersCount. The cascade in
// user/userPurge.service.js is the only correct way to remove a user.
userSchema.index({ isGuest: 1, expiresAt: 1 });

// Hot query paths that were previously collection scans:
//   role      - the guest signup auto-follow and the admin user list
//   status    - suggestions, the admin list, the ban sweep
//   isPrivate - the feed's discovery exclusion set
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isPrivate: 1 });
// "Suggested for you" sorts by followersCount, and the admin list and the
// analytics aggregation both sort/match on createdAt.
userSchema.index({ followersCount: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Instance method: compare raw password against stored hash
userSchema.methods.matchPassword = async function (rawPassword) {
    return bcrypt.compare(rawPassword, this.passwordHash);
};

// Static method: hash a password
userSchema.statics.hashPassword = async (rawPassword) =>
    bcrypt.hash(rawPassword, SALT_ROUNDS);

// Never serialise passwordHash to JSON
userSchema.set('toJSON', {
    transform(_doc, ret) {
        delete ret.passwordHash;
        return ret;
    },
});

module.exports = mongoose.model('User', userSchema);
