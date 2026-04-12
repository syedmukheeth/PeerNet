'use strict';

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Notification = require('../src/modules/notification/Notification');
const Post = require('../src/modules/post/Post');
const Comment = require('../src/modules/comment/Comment');
const Dscroll = require('../src/modules/dscroll/Dscroll');

async function debugNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('DB Connected');

        // Get recent notification with content
        const notif = await Notification.findOne({ 
            type: { $in: ['like', 'comment'] },
            entityId: { $ne: null }
        })
        .sort({ createdAt: -1 })
        .populate('entityId');

        if (!notif) {
            console.log('No notifications found to debug.');
            return;
        }

        console.log('--- RAW NOTIFICATION ---');
        console.log({
            _id: notif._id,
            type: notif.type,
            entityModel: notif.entityModel,
            entityId_type: typeof notif.entityId,
            entityId_is_object: notif.entityId && typeof notif.entityId === 'object'
        });

        if (notif.entityId && typeof notif.entityId === 'object') {
            console.log('--- ENTITY DATA ---');
            console.log(JSON.stringify(notif.entityId, null, 2));
            
            // Re-run population if it's a comment
            if (notif.entityModel === 'Comment') {
                await notif.populate('entityId.post');
                console.log('--- POPULATED COMMENT.POST ---');
                console.log(JSON.stringify(notif.entityId.post, null, 2));
            }
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await mongoose.connection.close();
    }
}

debugNotifications();
