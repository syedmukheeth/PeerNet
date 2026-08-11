'use strict';

/**
 * One-shot migration: replace the global unique index on Message.clientSideId
 * with one scoped to the sender.
 *
 * clientSideId is supplied by the client for retry idempotency. While the
 * unique index covered the field alone, one user reusing another user's id
 * both had that user's message body returned to them as a "duplicate" and,
 * on an accidental collision, silently lost their own message to a duplicate
 * key error. Message.js now declares { sender, clientSideId } instead.
 *
 * Mongoose creates the new index on boot but never drops the old one, so this
 * has to be run once against any database created before that change. It is
 * safe to run repeatedly and safe to run on a database that never had the old
 * index.
 *
 *   node src/migrations/001-scope-clientSideId-index.js
 *
 * Unlike the seeders this is intended to run against production, so it does
 * not use seeders/guard.js. It only drops one index and creates another; it
 * does not touch any document.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const logger = require('../config/logger');

const STALE_INDEX = 'clientSideId_1';

const run = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');

    await mongoose.connect(uri);
    const collection = mongoose.connection.collection('messages');

    const indexes = await collection.indexes();
    const stale = indexes.find((i) => i.name === STALE_INDEX);

    if (stale) {
        await collection.dropIndex(STALE_INDEX);
        logger.info(`Dropped stale index ${STALE_INDEX}`);
    } else {
        logger.info(`No ${STALE_INDEX} index present, nothing to drop`);
    }

    // Creating it here rather than waiting for the next boot means a failure
    // (a pre-existing duplicate pair, say) surfaces during the migration rather
    // than as a silent index-build error in the application log.
    await collection.createIndex(
        { sender: 1, clientSideId: 1 },
        { unique: true, partialFilterExpression: { clientSideId: { $type: 'string' } } },
    );
    logger.info('Created scoped index { sender: 1, clientSideId: 1 }');

    await mongoose.disconnect();
};

run().catch(async (err) => {
    logger.error(`Migration failed: ${err.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
