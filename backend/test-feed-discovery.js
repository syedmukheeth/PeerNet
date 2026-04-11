'use strict';

const mongoose = require('mongoose');
require('dotenv').config();
const feedService = require('./src/modules/feed/feed.service');
const User = require('./src/modules/user/User');
const Post = require('./src/modules/post/Post');
const { connectRedis } = require('./src/config/redis');

async function testDiscovery() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connecting to Redis...');
        await connectRedis();

        // 1. Find or create a "Fresh User" (no followers)
        let testUser = await User.findOne({ email: 'test_discovery@peernet.com' });
        if (!testUser) {
            testUser = await User.create({
                username: 'discovery_tester',
                email: 'test_discovery@peernet.com',
                password: 'password123',
                categoryAffinity: { 'tech': 10 }
            });
        }

        console.log(`Testing feed for user: ${testUser.username} (${testUser._id})`);

        // 2. Clear Redis cache for this user to force hydration
        const { getRedisOptional } = require('./src/config/redis');
        const redis = getRedisOptional();
        if (redis) {
            await redis.del(`feed:user:${testUser._id}`);
            console.log('Cleared Redis cache.');
        }

        // 3. Fetch feed
        const result = await feedService.getFeed(testUser._id, { limit: 10, page: 1 });
        
        console.log('--- Feed Results ---');
        console.log(`Count: ${result.data.length}`);
        
        if (result.data.length > 0) {
            console.log('✅ FEED DISCOVERY SUCCESS!');
            result.data.forEach((p, i) => {
                console.log(`${i+1}. [${p.score || 'ranked'}] ${p.author.username}: ${p.caption.substring(0, 30)}...`);
            });
        } else {
            console.log('❌ FEED STILL EMPTY. Check if there are ANY posts in the DB from the last 30 days.');
        }

    } catch (err) {
        console.error('Test FAILED:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testDiscovery();
