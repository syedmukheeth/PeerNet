'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../modules/user/User');
const Post = require('../modules/post/Post');
const connectDB = require('../config/db');
const logger = require('../config/logger');
const { assertSeedable } = require('./guard');

const SEED_PASSWORD = 'Seed@1234';

const seed = async () => {
    assertSeedable('seed.js');
    await connectDB();
    logger.info('Seeding database...');

    if (process.env.SEED_WIPE === 'yes') {
        logger.warn('SEED_WIPE=yes: deleting every user and post.');
        await Promise.all([User.deleteMany({}), Post.deleteMany({})]);
    }

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const accounts = [
        { username: 'admin', email: 'admin@peernet.dev', fullName: 'PeerNet Admin', role: 'admin' },
        { username: 'alice', email: 'alice@peernet.dev', fullName: 'Alice' },
        { username: 'bob', email: 'bob@peernet.dev', fullName: 'Bob' },
        { username: 'charlie', email: 'charlie@peernet.dev', fullName: 'Charlie' },
        { username: 'diana', email: 'diana@peernet.dev', fullName: 'Diana' },
        { username: 'eve', email: 'eve@peernet.dev', fullName: 'Eve' },
    ];

    const users = [];
    for (const account of accounts) {
        let user = await User.findOne({ email: account.email });
        if (user) {
            logger.info(`Already exists: @${user.username}`);
        } else {
            user = await User.create({ ...account, passwordHash });
            logger.info(`Created: @${user.username}`);
        }
        users.push(user);
    }

    // Sample posts use a placeholder public image, so skip the admin account.
    const authors = users.filter((u) => u.role !== 'admin');
    for (let i = 0; i < authors.length; i++) {
        const mediaPublicId = `peernet/posts/seed-${i + 1}`;
        if (await Post.findOne({ mediaPublicId })) continue;
        await Post.create({
            author: authors[i]._id,
            mediaUrl: `https://picsum.photos/seed/${i + 1}/600/600`,
            mediaPublicId,
            mediaType: 'image',
            caption: `Hello from ${authors[i].username}! Post #${i + 1}`,
        });
    }

    logger.info('Seeding complete.');
    logger.info(`Admin credentials: admin@peernet.dev / ${SEED_PASSWORD}`);
    logger.info(`User credentials: alice@peernet.dev (and bob, charlie, diana, eve) / ${SEED_PASSWORD}`);
    await mongoose.disconnect();
};

seed().catch((err) => {
    logger.error(err.message);
    process.exit(1);
});
