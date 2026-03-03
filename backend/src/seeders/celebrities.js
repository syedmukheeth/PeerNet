'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Follower = require('../models/Follower');
const connectDB = require('../config/db');
const logger = require('../config/logger');

const CELEB_PASSWORD = 'Celeb@1234';

const celebrities = [
    {
        username: 'virat.kohli',
        email: 'virat@peernet.dev',
        fullName: 'Virat Kohli',
        bio: '🏏 Cricket | Former India Captain | Chasing greatness every day 🇮🇳',
        avatarUrl: 'https://ui-avatars.com/api/?name=Virat+Kohli&background=1a73e8&color=fff&size=200',
        followersCount: 2500000,
        isVerified: true,
    },
    {
        username: 'cristiano',
        email: 'cr7@peernet.dev',
        fullName: 'Cristiano Ronaldo',
        bio: '⚽ Professional Footballer | SIUUUU! 🏆 | @alnassr_fc',
        avatarUrl: 'https://ui-avatars.com/api/?name=Cristiano+Ronaldo&background=c62828&color=fff&size=200',
        followersCount: 6200000,
        isVerified: true,
    },
    {
        username: 'leomessi',
        email: 'messi@peernet.dev',
        fullName: 'Lionel Messi',
        bio: '⚽ World Champion 🏆🌍 | Inter Miami CF | La Pulga',
        avatarUrl: 'https://ui-avatars.com/api/?name=Lionel+Messi&background=3f51b5&color=fff&size=200',
        followersCount: 5800000,
        isVerified: true,
    },
    {
        username: 'rogerfederer',
        email: 'federer@peernet.dev',
        fullName: 'Roger Federer',
        bio: '🎾 20x Grand Slam Champion | Forever grateful for the journey.',
        avatarUrl: 'https://ui-avatars.com/api/?name=Roger+Federer&background=388e3c&color=fff&size=200',
        followersCount: 1400000,
        isVerified: true,
    },
    {
        username: 'selenagomez',
        email: 'selena@peernet.dev',
        fullName: 'Selena Gomez',
        bio: '🎵 Artist | Rare Beauty founder | Be Kind 💜',
        avatarUrl: 'https://ui-avatars.com/api/?name=Selena+Gomez&background=ad1457&color=fff&size=200',
        followersCount: 4300000,
        isVerified: true,
    },
    {
        username: 'billgates',
        email: 'bill@peernet.dev',
        fullName: 'Bill Gates',
        bio: '💻 Co-founder of Microsoft | Philanthropist | Fighting disease worldwide 🌍',
        avatarUrl: 'https://ui-avatars.com/api/?name=Bill+Gates&background=01579b&color=fff&size=200',
        followersCount: 1100000,
        isVerified: true,
    },
    {
        username: 'drakegod',
        email: 'drake@peernet.dev',
        fullName: 'Drake',
        bio: '🎤 OVO Sound | 6 God | Toronto 🇨🇦',
        avatarUrl: 'https://ui-avatars.com/api/?name=Drake&background=4a148c&color=fff&size=200',
        followersCount: 3100000,
        isVerified: true,
    },
    {
        username: 'kimkardashian',
        email: 'kim@peernet.dev',
        fullName: 'Kim Kardashian',
        bio: '💅 SKIMS founder | SKKN by Kim | Mom of 4 👨‍👩‍👧‍👦',
        avatarUrl: 'https://ui-avatars.com/api/?name=Kim+Kardashian&background=bf360c&color=fff&size=200',
        followersCount: 3800000,
        isVerified: true,
    },
    {
        username: 'elonmusk',
        email: 'elon@peernet.dev',
        fullName: 'Elon Musk',
        bio: '🚀 SpaceX | Tesla | X | Making humans multiplanetary',
        avatarUrl: 'https://ui-avatars.com/api/?name=Elon+Musk&background=37474f&color=fff&size=200',
        followersCount: 4900000,
        isVerified: true,
    },
    {
        username: 'neymarjr',
        email: 'neymar@peernet.dev',
        fullName: 'Neymar Jr',
        bio: '⚽ Jogo Bonito | Al Hilal | 🇧🇷 Obrigado sempre!',
        avatarUrl: 'https://ui-avatars.com/api/?name=Neymar+Jr&background=f9a825&color=000&size=200',
        followersCount: 2200000,
        isVerified: true,
    },
];

const celebPosts = [
    { caption: 'Hard work always pays off 💪 Every day is a new opportunity. #cricket #fitness', seed: 10 },
    { caption: 'This feeling never gets old. SIUUUU! ⚽🏆 #cr7 #champions', seed: 20 },
    { caption: 'Grateful for every moment on the pitch. The World Cup was magic 🌍🏆', seed: 30 },
    { caption: '20 Grand Slams later... the journey was everything. Thank you tennis ❤️🎾', seed: 40 },
    { caption: 'New music coming soon 🎵 Stay Rare 💜', seed: 50 },
    { caption: 'Working on solutions to the world\'s biggest problems. Excited about the progress 🌍💡', seed: 60 },
    { caption: 'Toronto forever 🦉 New track dropping midnight. #OVO', seed: 70 },
    { caption: 'SKIMS holiday collection is HERE 🎁✨ Link in bio!', seed: 80 },
    { caption: 'First humans on Mars by 2029. We\'re making it happen 🚀🔴 #SpaceX', seed: 90 },
    { caption: 'Saudade do futebol ⚽💛💚 Vamos Brasil! Recovery going well 🙏', seed: 100 },
];

const seed = async () => {
    await connectDB();
    logger.info('Seeding celebrity accounts...');

    const hash = await bcrypt.hash(CELEB_PASSWORD, 12);
    const createdCelebs = [];

    for (let i = 0; i < celebrities.length; i++) {
        const c = celebrities[i];
        // Upsert — don't crash if already exists
        let user = await User.findOne({ email: c.email });
        if (!user) {
            user = await User.create({
                username: c.username,
                email: c.email,
                passwordHash: hash,
                fullName: c.fullName,
                bio: c.bio,
                avatarUrl: c.avatarUrl,
                followersCount: c.followersCount,
                isVerified: c.isVerified,
            });
            logger.info(`Created: @${user.username}`);
        } else {
            logger.info(`Already exists: @${user.username}`);
        }
        createdCelebs.push(user);

        // Add a sample post
        const existing = await Post.findOne({ author: user._id });
        if (!existing) {
            await Post.create({
                author: user._id,
                mediaUrl: `https://picsum.photos/seed/${celebPosts[i].seed}/600/600`,
                mediaPublicId: `peernet/posts/celeb-${i + 1}`,
                mediaType: 'image',
                caption: celebPosts[i].caption,
                likesCount: Math.floor(Math.random() * 50000) + 1000,
                commentsCount: Math.floor(Math.random() * 5000) + 100,
            });
        }
    }

    // Make celebrities follow each other
    for (const a of createdCelebs) {
        for (const b of createdCelebs) {
            if (a._id.toString() !== b._id.toString()) {
                const exists = await Follower.findOne({ follower: a._id, following: b._id });
                if (!exists) {
                    await Follower.create({ follower: a._id, following: b._id });
                }
            }
        }
        // Update following count
        const followingCount = createdCelebs.length - 1;
        await User.findByIdAndUpdate(a._id, { $set: { followingCount } });
    }

    logger.info('\n✅ Celebrity accounts seeded!\n');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Password for ALL celebrities: Celeb@1234');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    celebrities.forEach(c => {
        logger.info(`  @${c.username.padEnd(18)} ${c.email}`);
    });
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
};

seed().catch((err) => {
    logger.error(err.message);
    process.exit(1);
});
