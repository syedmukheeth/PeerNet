'use strict';

const cron = require('node-cron');
const Story = require('../models/Story');
const { deleteFromCloudinary } = require('../utils/cloudinary.utils');
const logger = require('../config/logger');

const scheduleStoryCleanup = () => {
    // Run at the top of every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('[StoryCleanup] Running job...');
        try {
            const expired = await Story.find({ expiresAt: { $lte: new Date() } });
            if (!expired.length) {
                logger.info('[StoryCleanup] No expired stories found');
                return;
            }

            // Delete Cloudinary assets first, then DB records
            await Promise.allSettled(
                expired.map((story) =>
                    deleteFromCloudinary(
                        story.mediaPublicId,
                        story.mediaType === 'video' ? 'video' : 'image',
                    ),
                ),
            );

            const ids = expired.map((s) => s._id);
            const result = await Story.deleteMany({ _id: { $in: ids } });
            logger.info(`[StoryCleanup] Deleted ${result.deletedCount} stories`);
        } catch (err) {
            logger.error(`[StoryCleanup] Error: ${err.message}`);
        }
    });

    logger.info('[StoryCleanup] Cron scheduled: every hour');
};

module.exports = { scheduleStoryCleanup };
