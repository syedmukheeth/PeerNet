'use strict';

/**
 * Update-pipeline stage that decrements a denormalised counter without letting
 * it go negative.
 *
 * The counters carry `min: 0` in their schemas, but that is document validation:
 * findByIdAndUpdate/updateMany with `$inc: -1` bypass it entirely. Any path that
 * decrements more times than it incremented (a double-submitted unlike, a retried
 * cascade, a delete that runs twice) then leaves a permanently negative count
 * rendered in the UI. This clamps at the database instead.
 *
 *   await Post.findByIdAndUpdate(id, clampedDecrement('likesCount'));
 */
const clampedDecrement = (field, amount = 1) => [
    { $set: { [field]: { $max: [0, { $subtract: [`$${field}`, amount] }] } } },
];

module.exports = { clampedDecrement };
