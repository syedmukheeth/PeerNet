'use strict';

// How long a guest account lives from the moment it is created.
// Shared by auth.service.guestLogin (which stamps expiresAt) and
// jobs/guestCleanup.job.js (which backfills legacy guests), so the two can
// never drift apart.
const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

// The shape auth.service.guestLogin mints: guest_<8 hex chars>, with a matching
// @peernet.app address. Both are required to identify a legacy guest, so a real
// user who happens to register the username "guest_deadbeef" is never swept.
const GUEST_USERNAME_PATTERN = /^guest_[0-9a-f]{8}$/;
const GUEST_EMAIL_PATTERN = /^guest_[0-9a-f]{8}@peernet\.app$/;

module.exports = { GUEST_TTL_MS, GUEST_USERNAME_PATTERN, GUEST_EMAIL_PATTERN };
