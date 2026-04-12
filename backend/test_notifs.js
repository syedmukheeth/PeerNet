'use strict';

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Notification = require('./src/modules/notification/Notification');
const Post = require('./src/modules/post/Post');
const Comment = require('./src/modules/comment/Comment');
const Dscroll = require('./src/modules/dscroll/Dscroll');
const notifService = require('./src/modules/notification/notification.service');

async function testFormat() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('DB Connected');

        const userId = '67ab0f5080c98f99e3dd2454'; // A valid user from logs
        const result = await notifService.getNotifications(userId, { limit: 5 });

        console.log('--- FORMATTED RESULTS ---');
        result.data.forEach(n => {
            console.log(`Type: ${n.type} | Thumbnail: ${n.thumbnail ? 'YES (' + n.thumbnail.substring(0, 15) + '...)' : 'NO'}`);
            if (!n.thumbnail) {
                console.log('  Reason: targetEntity lookup failed. EntityId type:', typeof n.entityId);
            }
        });

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await mongoose.connection.close();
    }
}

testFormat();
