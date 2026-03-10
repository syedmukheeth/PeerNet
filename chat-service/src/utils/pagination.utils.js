'use strict';

/**
 * Parse cursor-based pagination params from query string.
 * @param {object} query - Express req.query
 * @param {number} defaultLimit
 * @returns {{ limit, cursor, skip }}
 */
const parsePagination = (query, defaultLimit = 20) => {
    const limit = Math.min(parseInt(query.limit, 10) || defaultLimit, 50);
    const cursor = query.cursor || null; // ISO date string or ObjectId
    return { limit, cursor };
};

/**
 * Build a standard paginated response shape.
 */
const paginatedResponse = (data, nextCursor) => ({
    data,
    nextCursor: nextCursor || null,
    hasMore: Boolean(nextCursor),
});

module.exports = { parsePagination, paginatedResponse };
