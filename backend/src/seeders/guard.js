'use strict';

// This runs before anything else in a seeder and has to report why it aborted
// even when the logger is not wired up, so console is deliberate here.
/* eslint-disable no-console */

const path = require('path');

// Mirrors server.js: root .env wins because dotenv never overwrites an existing
// key. Seeders only did a cwd-relative load, so the URI they connected with
// depended on where they were launched from and the guard could miss it.
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'mongo', 'mongodb']);

const OVERRIDE = 'i-understand-this-destroys-remote-data';

const hostsOf = (uri) => {
    const afterScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, '');
    const afterCreds = afterScheme.includes('@') ? afterScheme.slice(afterScheme.lastIndexOf('@') + 1) : afterScheme;
    const authority = afterCreds.split(/[/?]/)[0];
    return authority.split(',').map((h) => h.split(':')[0].toLowerCase()).filter(Boolean);
};

const isLocalUri = (uri) => {
    const hosts = hostsOf(uri);
    return hosts.length > 0 && hosts.every((h) => LOCAL_HOSTS.has(h));
};

// Seeders wipe and fabricate data. Running one against the deployed cluster on
// 2026-08-03 destroyed every real user and post, so a remote URI now needs an
// explicit opt-in rather than just working.
const assertSeedable = (label) => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error('MONGO_URI is not set. Aborting.');
        process.exit(1);
    }

    if (isLocalUri(uri)) return;

    if (process.env.SEED_ALLOW_REMOTE === OVERRIDE) {
        console.warn(`WARNING: ${label} is running against a REMOTE database (${hostsOf(uri).join(',')}).`);
        return;
    }

    console.error(`Refusing to run ${label}: MONGO_URI points at ${hostsOf(uri).join(',')}, which is not a local database.`);
    console.error('Seeders fabricate data and some of them delete existing collections.');
    console.error(`If you truly intend this, set SEED_ALLOW_REMOTE=${OVERRIDE}`);
    process.exit(1);
};

module.exports = { assertSeedable, isLocalUri };
