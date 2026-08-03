'use strict';

const cron = require('node-cron');
const User = require('../modules/user/User');
const { purgeUser } = require('../modules/user/userPurge.service');
const {
    GUEST_TTL_MS,
    GUEST_USERNAME_PATTERN,
    GUEST_EMAIL_PATTERN,
} = require('../modules/user/guest.constants');
const logger = require('../config/logger');

// How many expired guests a single tick will remove. Each purge issues roughly
// twenty five queries plus Cloudinary calls, so this bounds both the load on a
// small Render instance and the blast radius of the very first sweep after the
// backfill, when every legacy guest is expired at once.
const BATCH_SIZE = Number(process.env.GUEST_CLEANUP_BATCH) || 50;

// Defaults to true so the first deploy only reports what it would do. Flip
// GUEST_CLEANUP_DRY_RUN to "false" once the reported count looks right.
const isDryRun = () => process.env.GUEST_CLEANUP_DRY_RUN !== 'false';

/**
 * Flag guest accounts that predate the isGuest field and give them an expiry
 * derived from when they were actually created.
 *
 * Idempotent: once a row is flagged it stops matching the filter, so this costs
 * one indexed count on every subsequent boot.
 */
const backfillGuestExpiry = async () => {
    // Both patterns plus role must match. Only auth.service.guestLogin mints a
    // @peernet.app address, so a real user cannot be caught by this.
    const filter = {
        isGuest: { $ne: true },
        role: 'user',
        username: GUEST_USERNAME_PATTERN,
        email: GUEST_EMAIL_PATTERN,
    };

    const pending = await User.countDocuments(filter);
    if (!pending) return 0;

    if (isDryRun()) {
        logger.warn(
            `[GuestCleanup] Backfill DRY RUN: ${pending} legacy guest accounts would be flagged. ` +
                'Set GUEST_CLEANUP_DRY_RUN=false to apply.',
        );
        return 0;
    }

    const result = await User.updateMany(filter, [
        {
            $set: {
                isGuest: true,
                expiresAt: { $add: ['$createdAt', GUEST_TTL_MS] },
            },
        },
    ]);

    logger.info(`[GuestCleanup] Backfilled ${result.modifiedCount} legacy guest accounts`);
    return result.modifiedCount;
};

/**
 * Remove one batch of expired guests, cascading each one.
 */
const runGuestCleanup = async () => {
    const expired = await User.find({ isGuest: true, expiresAt: { $lte: new Date() } })
        .select('_id username')
        .limit(BATCH_SIZE)
        .lean();

    if (!expired.length) {
        logger.info('[GuestCleanup] No expired guest accounts found');
        return { purged: 0, failed: 0 };
    }

    if (isDryRun()) {
        logger.warn(
            `[GuestCleanup] DRY RUN: ${expired.length} expired guest accounts would be purged. ` +
                'Set GUEST_CLEANUP_DRY_RUN=false to apply.',
        );
        return { purged: 0, failed: 0 };
    }

    let purged = 0;
    let failed = 0;

    // Sequential on purpose. Each purge is a couple of dozen queries plus
    // Cloudinary round trips, and running the whole batch in parallel would
    // saturate the Mongoose connection pool. The per item catch means one bad
    // account cannot abort the rest of the sweep.
    for (const guest of expired) {
        try {
            await purgeUser(guest._id);
            purged += 1;
        } catch (err) {
            failed += 1;
            logger.error(`[GuestCleanup] Failed to purge @${guest.username}: ${err.message}`);
        }
    }

    logger.info(`[GuestCleanup] Purged ${purged}/${expired.length} guest accounts (${failed} failed)`);
    return { purged, failed };
};

const scheduleGuestCleanup = async () => {
    // Backfill before the first tick so legacy guests are eligible immediately.
    await backfillGuestExpiry();

    // Offset from storyCleanup's '0 * * * *' so the two jobs do not contend.
    cron.schedule('15 * * * *', async () => {
        logger.info('[GuestCleanup] Running job...');
        try {
            await runGuestCleanup();
        } catch (err) {
            logger.error(`[GuestCleanup] Error: ${err.message}`);
        }
    });

    logger.info(
        `[GuestCleanup] Cron scheduled: every hour (batch ${BATCH_SIZE}` +
            `${isDryRun() ? ', DRY RUN' : ''})`,
    );
};

module.exports = { scheduleGuestCleanup, runGuestCleanup, backfillGuestExpiry };
