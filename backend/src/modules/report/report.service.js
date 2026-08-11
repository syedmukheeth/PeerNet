'use strict';

const mongoose = require('mongoose');
const Report = require('../admin/Report');
const Post = require('../post/Post');
const Comment = require('../comment/Comment');
const Story = require('../story/Story');
const User = require('../user/User');
const ApiError = require('../../utils/ApiError');

const TARGET_MODELS = { User, Post, Comment, Story };

/**
 * Files a report for moderator review.
 *
 * The Report model, the admin moderation queue and the resolve endpoint all
 * existed, but nothing could ever create a report: there was no route. The
 * queue was permanently empty, while the client's "Report" menu item showed a
 * success toast and called no API at all.
 */
const createReport = async (reporterId, { targetType, targetId, reason, description }) => {
    const Model = TARGET_MODELS[targetType];
    if (!Model) throw new ApiError(400, 'Unsupported report target');

    const exists = await Model.exists({ _id: targetId });
    if (!exists) throw new ApiError(404, `${targetType} not found`);

    if (targetType === 'User' && targetId.toString() === reporterId.toString()) {
        throw new ApiError(400, 'You cannot report yourself');
    }

    // One open report per reporter per target. Without this the queue fills
    // with duplicates from a single user tapping the button repeatedly.
    const existing = await Report.findOne({
        reporter: reporterId,
        targetId,
        targetType,
        status: 'pending',
    });
    if (existing) return existing;

    return Report.create({
        reporter: reporterId,
        targetType,
        targetId: new mongoose.Types.ObjectId(targetId),
        reason,
        description,
    });
};

module.exports = { createReport };
