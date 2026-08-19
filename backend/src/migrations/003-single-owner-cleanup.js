'use strict';

/**
 * One-shot migration: reduce the platform to a single owner account.
 *
 * Promotes the keeper to superadmin and purges every other user. Nothing in
 * the application ever creates a superadmin, so this is the only way to get
 * one, and the admin console's superadmin-only routes (password reset, the
 * infrastructure nuke) are unreachable until it has run.
 *
 * Deletion goes through modules/user/userPurge.service, which already cascades
 * thirteen collections plus Cloudinary media and Redis keys, deletes the User
 * row last so an interrupted run is recoverable, and is idempotent.
 *
 * Dry run, prints the kill list and changes nothing:
 *
 *   node src/migrations/003-single-owner-cleanup.js
 *
 * Then, once the list has been read and is correct:
 *
 *   CONFIRM_PURGE=delete-all-other-accounts node src/migrations/003-single-owner-cleanup.js
 *
 * Unlike the seeders this is meant to run against production, so it does not
 * use seeders/guard.js. That makes the CONFIRM_PURGE gate the only thing
 * standing between an idle invocation and irreversible data loss, which is why
 * it is required rather than merely recommended. Set KEEP_USERNAME to override
 * the keeper.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../modules/user/User');
const { purgeUser } = require('../modules/user/userPurge.service');
const logger = require('../config/logger');

const KEEP_USERNAME = (process.env.KEEP_USERNAME || 'mukheeth2005').toLowerCase();
const CONFIRM_TOKEN = 'delete-all-other-accounts';

const run = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');

    const confirmed = process.env.CONFIRM_PURGE === CONFIRM_TOKEN;

    await mongoose.connect(uri);

    // Username is unique and lowercased by the schema, so an exact match is
    // enough. findOne over find keeps the "more than one match" case honest:
    // if the index were ever missing, we want to abort rather than guess.
    const keepers = await User.find({ username: KEEP_USERNAME })
        .select('username email role status')
        .lean();

    if (keepers.length === 0) {
        throw new Error(`No user named @${KEEP_USERNAME}. Nothing was changed.`);
    }
    if (keepers.length > 1) {
        throw new Error(`${keepers.length} users named @${KEEP_USERNAME}. Refusing to guess.`);
    }

    const keeper = keepers[0];
    const doomed = await User.find({ _id: { $ne: keeper._id } })
        .select('username email role createdAt')
        .sort({ createdAt: 1 })
        .lean();

    logger.info(`Keeper: @${keeper.username} <${keeper.email}> role=${keeper.role} status=${keeper.status}`);
    logger.info(`Accounts to delete: ${doomed.length}`);
    doomed.forEach((u, i) => {
        logger.info(`  ${String(i + 1).padStart(3)}. @${u.username} <${u.email}> role=${u.role}`);
    });

    if (!confirmed) {
        logger.info('');
        logger.info('DRY RUN. Nothing was deleted and no role was changed.');
        logger.info(`Re-run with CONFIRM_PURGE=${CONFIRM_TOKEN} to apply.`);
        await mongoose.disconnect();
        return;
    }

    // Promote first. If the purge loop dies halfway the owner still has the
    // console they need to finish the job by hand.
    if (keeper.role !== 'superadmin' || keeper.status !== 'active') {
        await User.updateOne(
            { _id: keeper._id },
            { $set: { role: 'superadmin', status: 'active' } },
        );
        logger.info(`Promoted @${keeper.username} to superadmin`);
    } else {
        logger.info(`@${keeper.username} is already an active superadmin`);
    }

    // Sequential, not Promise.all: every purge decrements denormalised counters
    // on other users, and concurrent read-modify-write on the same document is
    // exactly how those counters drift.
    let purged = 0;
    let failed = 0;
    for (const u of doomed) {
        try {
            const result = await purgeUser(u._id);
            if (result.skipped) {
                logger.warn(`Skipped @${u.username}, already gone`);
            } else {
                purged += 1;
            }
        } catch (err) {
            failed += 1;
            logger.error(`Failed to purge @${u.username}: ${err.message}`);
        }
    }

    const remaining = await User.countDocuments();
    logger.info('');
    logger.info(`Purged ${purged}, failed ${failed}, users remaining: ${remaining}`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    logger.error(`Migration failed: ${err.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
