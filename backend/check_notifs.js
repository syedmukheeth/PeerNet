require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./src/modules/notification/Notification');

async function check() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not defined in env');
        process.exit(1);
    }
    await mongoose.connect(uri);
    const lastNotifs = await Notification.find().sort({ createdAt: -1 }).limit(10).populate('sender').lean();
    console.log(JSON.stringify(lastNotifs, null, 2));
    process.exit(0);
}

check();
