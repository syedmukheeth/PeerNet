'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../modules/user/User');
const Post = require('../modules/post/Post');
const connectDB = require('../config/db');
const logger = require('../config/logger');

const SEED_PASSWORD = 'Seed@1234';

const seed = async () => {
    await connectDB();
    logger.info('Seeding database...');

    // Clean up
    await Promise.all([User.deleteMany({}), Post.deleteMany({})]);

    // Create admin
    const adminHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const admin = await User.create({
        username: 'admin',
        email: 'admin@peernet.dev',
        passwordHash: adminHash,
        fullName: 'PeerNet Admin',
        role: 'admin',
    });

    // Create 5 sample users
    const userHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const users = await User.insertMany([
        { username: 'alice', email: 'alice@peernet.dev', passwordHash: userHash, fullName: 'Alice' },
        { username: 'bob', email: 'bob@peernet.dev', passwordHash: userHash, fullName: 'Bob' },
        { username: 'charlie', email: 'charlie@peernet.dev', passwordHash: userHash, fullName: 'Charlie' },
        { username: 'diana', email: 'diana@peernet.dev', passwordHash: userHash, fullName: 'Diana' },
        { username: 'eve', email: 'eve@peernet.dev', passwordHash: userHash, fullName: 'Eve' },
    ]);

    // Create sample posts (using a placeholder public image)
    await Post.insertMany(
        users.map((u, i) => ({
            author: u._id,
            mediaUrl: `https://picsum.photos/seed/${i + 1}/600/600`,
            mediaPublicId: `peernet/posts/seed-${i + 1}`,
            mediaType: 'image',
            caption: `Hello from ${u.username}! Post #${i + 1} 🚀`,
        })),
    );

    logger.info('✅ Seeding complete.');
    logger.info(`Admin credentials: admin@peernet.dev / ${SEED_PASSWORD}`);
    logger.info(`User credentials: alice@peernet.dev (and bob, charlie, diana, eve) / ${SEED_PASSWORD}`);
    await mongoose.disconnect();
};

seed().catch((err) => {
    logger.error(err.message);
    process.exit(1);
});
