'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌  MONGO_URI environment variable is not set. Aborting.');
    process.exit(1);
}

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        fullName: { type: String, required: true, trim: true },
        bio: { type: String, default: '' },
        avatarUrl: { type: String, default: '' },
        avatarPublicId: { type: String, default: '' },
        website: { type: String, default: '' },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        isVerified: { type: Boolean, default: false },
        isPrivate: { type: Boolean, default: false },
        followersCount: { type: Number, default: 0 },
        followingCount: { type: Number, default: 0 },
        postsCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);
const User = mongoose.model('User', userSchema);

const SALT = 12;
const seeds = [
    { username: 'admin', email: 'admin@peernet.dev', password: 'Seed@1234', fullName: 'Admin User', role: 'admin', isVerified: true },
    { username: 'alice', email: 'alice@peernet.dev', password: 'Seed@1234', fullName: 'Alice Demo', role: 'user', isVerified: true },
    { username: 'virat', email: 'virat@peernet.dev', password: 'Celob@1234', fullName: 'Virat Celeb', role: 'user', isVerified: true },
];

(async () => {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected!\n');

    for (const seed of seeds) {
        try {
            const existing = await User.findOne({ email: seed.email });
            if (existing) {
                console.log(`⏭  Skipped (already exists): ${seed.email}`);
                continue;
            }
            const passwordHash = await bcrypt.hash(seed.password, SALT);
            await User.create({ ...seed, passwordHash });
            console.log(`✅ Created: ${seed.email} / ${seed.password}  [${seed.role}]`);
        } catch (e) {
            console.error(`❌ Failed ${seed.email}:`, e.message);
        }
    }

    await mongoose.disconnect();
    console.log('\nDone! Users are ready in production.');
})();
