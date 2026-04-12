const mongoose = require('mongoose');

async function test() {
    await mongoose.connect('[REDACTED_MONGODB_URI]?retryWrites=true&w=majority');
    const Notification = require('./src/modules/notification/Notification');
    const Comment = require('./src/modules/comment/Comment');
    const Post = require('./src/modules/post/Post');

    const notifs = await Notification.find({ type: 'comment' }).sort({ createdAt: -1 }).limit(10).lean();
    for (let notif of notifs) {
        let commentId = notif.entityId;
        let comment = await Comment.findById(commentId).lean();
        console.log(`Notification ID: ${notif._id}`);
        console.log(`Entity ID (Comment): ${commentId}`);
        if (comment) {
            console.log(`  -> Comment EXISTS: `, comment.body.substring(0, 20), `... post:`, comment.post);
        } else {
            console.log(`  -> Comment DELETED/MISSING!`);
        }
    }
    process.exit(0);
}

test().catch(console.dir);
