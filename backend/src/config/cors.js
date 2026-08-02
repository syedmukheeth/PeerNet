'use strict';

// Origins are read from ALLOWED_ORIGINS, split on commas or whitespace so both
// "a,b" and "a b" work. A trailing slash is stripped because the browser sends
// an Origin header without one.
//
// There is deliberately no wildcard such as /\.vercel\.app$/: combined with
// credentials that would let any Vercel account call this API with the user's
// cookies. Every deployed frontend origin must be listed explicitly.
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

const getAllowedOrigins = () => {
    const configured = (process.env.ALLOWED_ORIGINS || '')
        .split(/[\s,]+/)
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean);

    return configured.length ? configured : DEFAULT_ORIGINS;
};

const isOriginAllowed = (origin) => getAllowedOrigins().includes(origin);

module.exports = { getAllowedOrigins, isOriginAllowed, DEFAULT_ORIGINS };
