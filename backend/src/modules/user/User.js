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
    },
    { timestamps: true },
);

// Compound text index for search
userSchema.index({ username: 'text', fullName: 'text' });

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
