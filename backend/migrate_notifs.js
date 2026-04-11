
async function migrate() {
    const mongoose = require('mongoose');
    require('dotenv').config();
    const Notification = require('./src/modules/notification/Notification');

    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI is missing from .env');
        process.exit(1);
    }

    await mongoose.connect(uri);
    
    // Update all notifications where entityModel is null or missing, for like/comment types
    const result = await Notification.updateMany(
        { 
            $or: [{ entityModel: { $exists: false } }, { entityModel: null }],
            type: { $in: ['like', 'comment', 'reply'] } 
        },
        { $set: { entityModel: 'Post' } }
    );
    
    console.log(`Successfully migrated ${result.modifiedCount} legacy notifications.`);
    process.exit(0);
}

migrate();
