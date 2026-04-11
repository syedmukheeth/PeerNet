require('dotenv').config();
const mongoose = require('mongoose');
const { connectRedis } = require('./src/config/redis');
const { getFeed } = require('./src/modules/feed/feed.service.js');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    await connectRedis();
    const user = await mongoose.connection.collection('users').findOne({ username: 'syedmukheeth' });
    if (!user) return console.log('user not found');
    
    // Call getFeed
    const feed = await getFeed(user._id, { limit: 20 });
    console.log('Feed Length:', feed.data.length);
    console.log('Authors populated:', JSON.stringify(feed.data.map(p => p?.author), null, 2));
    
    process.exit(0);
}
main().catch(console.error);
