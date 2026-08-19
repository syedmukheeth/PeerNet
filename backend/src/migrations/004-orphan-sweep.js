'use strict';

/**
 * One-shot migration: delete rows whose owner no longer exists.
 *
 * modules/user/userPurge.service cascades correctly for the account it is
 * deleting, but it can only clean up what it knows about at the time. Accounts
 * removed before it existed, and guest accounts expired by the cleanup cron,
 * left their rows behind. After 003 reduced the platform to one account the
 * database still held 46 follow edges, 167 messages, 57 notifications and 51
 * likes, every one of them pointing at a user id that is not in the users
 * collection any more.
 *
 * Those rows are not merely untidy. getFeed and the notification list both
 * populate a sender and render whatever comes back, so an orphan surfaces as a
 * blank row in the UI, and the denormalised counters on the surviving accounts
 * count them.
 *
 * What this deletes:
 *   - any row whose user reference does not resolve to a live user
 *   - any comment, like or saved post whose target post is gone
 *   - the reels, shorts and dscrolls collections, left by the Shorts feature
 *     that commit cb8dc26 removed. No model or route refers to them.
 *
 * Then it recomputes postsCount, followersCount and followingCount per user
 * and likesCount and commentsCount per post from what actually survived.
 *
 * Dry run, prints what would go and changes nothing:
 *
 *   node src/migrations/004-orphan-sweep.js
 *
 * Then, once the numbers look right:
 *
 *   CONFIRM_SWEEP=delete-orphans node src/migrations/004-orphan-sweep.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const logger = require('../config/logger');

const CONFIRM_TOKEN = 'delete-orphans';

// collection -> the fields that must resolve to a live user. An array field
// (conversations.participants) is orphaned when any member of it is gone: a
// conversation with a deleted participant can never be opened again.
const USER_REFS = {
    comments: ['author'],
    conversations: ['participants'],
    followers: ['follower', 'following'],
    likes: ['user'],
    messages: ['sender'],
    notifications: ['recipient', 'sender'],
    savedposts: ['user'],
    stories: ['author'],
    posts: ['author'],
    reports: ['reporter'],
    feedbacks: ['userId'],
    refreshtokens: ['user'],
    adminlogs: ['adminId'],
};

// Dead collections from the removed Shorts feature. Dropped rather than swept:
// nothing in backend/src reads them.
const DEAD_COLLECTIONS = ['reels', 'shorts', 'dscrolls'];

const run = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');

    const confirmed = process.env.CONFIRM_SWEEP === CONFIRM_TOKEN;

    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const liveUsers = new Set(
        (await db.collection('users').find({}, { projection: { _id: 1 } }).toArray())
            .map((u) => u._id.toString()),
    );
    if (liveUsers.size === 0) throw new Error('No users at all. Refusing to sweep an empty database.');

    const present = new Set((await db.listCollections().toArray()).map((c) => c.name));
    const doomedIds = {};

    // Pass one: rows whose owner is gone.
    for (const [name, fields] of Object.entries(USER_REFS)) {
        if (!present.has(name)) continue;

        const projection = { _id: 1 };
        fields.forEach((f) => { projection[f] = 1; });
        const docs = await db.collection(name).find({}, { projection }).toArray();

        const orphans = docs.filter((doc) => fields.some((field) => {
            const value = doc[field];
            if (Array.isArray(value)) return value.some((v) => v && !liveUsers.has(v.toString()));
            return value && !liveUsers.has(value.toString());
        }));

        if (orphans.length) doomedIds[name] = orphans.map((d) => d._id);
        logger.info(`${name.padEnd(15)} ${String(docs.length).padStart(5)} rows, ${String(orphans.length).padStart(5)} orphaned`);
    }

    // Pass two: rows hanging off a post that no longer exists. Runs against the
    // posts that survive pass one, so a comment on a purged user's post counts
    // here even when its own author is still around.
    const survivingPosts = new Set(
        (await db.collection('posts').find({}, { projection: { _id: 1 } }).toArray())
            .filter((p) => !(doomedIds.posts || []).some((id) => id.equals(p._id)))
            .map((p) => p._id.toString()),
    );

    for (const [name, field] of [['comments', 'post'], ['savedposts', 'post'], ['likes', 'targetId']]) {
        if (!present.has(name)) continue;

        const already = new Set((doomedIds[name] || []).map((id) => id.toString()));
        const docs = await db.collection(name)
            .find({}, { projection: { _id: 1, [field]: 1, targetModel: 1 } })
            .toArray();

        const extra = docs.filter((d) => {
            if (already.has(d._id.toString())) return false;
            // A like can point at a comment rather than a post; only judge the
            // ones that claim to be about a post.
            if (name === 'likes' && d.targetModel && d.targetModel !== 'Post') return false;
            return d[field] && !survivingPosts.has(d[field].toString());
        });

        if (extra.length) {
            doomedIds[name] = (doomedIds[name] || []).concat(extra.map((d) => d._id));
            logger.info(`${name.padEnd(15)} ${String(extra.length).padStart(5)} more, target post is gone`);
        }
    }

    const totalDoomed = Object.values(doomedIds).reduce((n, ids) => n + ids.length, 0);
    logger.info('');
    logger.info(`Rows to delete: ${totalDoomed}`);
    logger.info(`Collections to drop: ${DEAD_COLLECTIONS.filter((c) => present.has(c)).join(', ') || 'none'}`);

    if (!confirmed) {
        logger.info('');
        logger.info('DRY RUN. Nothing was deleted and no counter was changed.');
        logger.info(`Re-run with CONFIRM_SWEEP=${CONFIRM_TOKEN} to apply.`);
        await mongoose.disconnect();
        return;
    }

    for (const [name, ids] of Object.entries(doomedIds)) {
        const { deletedCount } = await db.collection(name).deleteMany({ _id: { $in: ids } });
        logger.info(`Deleted ${deletedCount} from ${name}`);
    }

    for (const name of DEAD_COLLECTIONS) {
        if (!present.has(name)) continue;
        await db.collection(name).drop();
        logger.info(`Dropped ${name}`);
    }

    // Counters last, so they are computed from what actually survived rather
    // than from what was there when the sweep started.
    for (const id of liveUsers) {
        const _id = new mongoose.Types.ObjectId(id);
        const [postsCount, followersCount, followingCount] = await Promise.all([
            db.collection('posts').countDocuments({ author: _id, isArchived: { $ne: true } }),
            db.collection('followers').countDocuments({ following: _id }),
            db.collection('followers').countDocuments({ follower: _id }),
        ]);
        await db.collection('users').updateOne({ _id }, { $set: { postsCount, followersCount, followingCount } });
        logger.info(`Recounted ${id}: ${postsCount} posts, ${followersCount} followers, ${followingCount} following`);
    }

    const posts = await db.collection('posts').find({}, { projection: { _id: 1 } }).toArray();
    for (const post of posts) {
        const [likesCount, commentsCount] = await Promise.all([
            db.collection('likes').countDocuments({ targetId: post._id, targetModel: 'Post' }),
            db.collection('comments').countDocuments({ post: post._id }),
        ]);
        await db.collection('posts').updateOne({ _id: post._id }, { $set: { likesCount, commentsCount } });
    }
    logger.info(`Recounted ${posts.length} posts`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    logger.error(`Migration failed: ${err.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
