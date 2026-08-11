'use strict';

/**
 * Parse cursor-based pagination params from query string.
 * @param {object} query - Express req.query
 * @param {number} defaultLimit
 * @returns {{ limit, cursor, skip }}
 */
const MAX_LIMIT = 50;

const parsePagination = (query, defaultLimit = 20) => {
    const parsed = parseInt(query.limit, 10);
    // Floored at 1 as well as capped. Without the floor, ?limit=-5 reached
    // Mongo as .limit(-5), which it reads as "one batch of 5" rather than an
    // error, and broke the limit+1 look-ahead arithmetic every caller relies on.
    const limit = Number.isFinite(parsed)
        ? Math.max(1, Math.min(parsed, MAX_LIMIT))
        : defaultLimit;
    const cursor = query.cursor || null; // ISO date string or ObjectId
    return { limit, cursor };
};

module.exports = { parsePagination };
