'use strict';

/**
 * One-shot migration: replace the TTL index on Story.expiresAt with a plain
 * lookup index.
 *
 * Story carried { expiresAt: 1 }, { expireAfterSeconds: 0 }. Mongo's TTL monitor
 * deletes matching documents itself, with no application hook, so it always beat
 * the hourly cron in jobs/storyCleanup.job.js to the expired stories. The cron
 * is the only thing that frees the story's Cloudinary asset, so every expired
 * story leaked its media permanently. Story.js now declares a plain index and
 * lets the cron own deletion.
 *
 * Mongoose will not alter an existing index whose keys match but whose options
 * differ, so this has to be run once against any database created before that
 * change.
 *
 *   node src/migrations/002-drop-story-ttl-index.js
 *
 * Safe to run repeatedly. Touches no documents.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const logger = require('../config/logger');

const INDEX_NAME = 'expiresAt_1';

const run = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');

    await mongoose.connect(uri);
    const collection = mongoose.connection.collection('stories');

    const indexes = await collection.indexes();
    const existing = indexes.find((i) => i.name === INDEX_NAME);

    if (existing && existing.expireAfterSeconds !== undefined) {
        await collection.dropIndex(INDEX_NAME);
        logger.info(`Dropped TTL index ${INDEX_NAME}`);
        await collection.createIndex({ expiresAt: 1 });
        logger.info('Created plain lookup index { expiresAt: 1 }');
    } else if (existing) {
        logger.info(`${INDEX_NAME} is already a plain index, nothing to do`);
    } else {
        await collection.createIndex({ expiresAt: 1 });
        logger.info('Created plain lookup index { expiresAt: 1 }');
    }

    await mongoose.disconnect();
};

run().catch(async (err) => {
    logger.error(`Migration failed: ${err.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
