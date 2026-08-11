'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Mobile clients routinely send application/octet-stream instead of a real
// type, so the fallback has to stay. Previously it was a blanket accept, which
// meant any file at all could be uploaded and post.service then guessed "video"
// from the type string. Now the extension has to resolve to something allowed,
// and file.mimetype is rewritten to the resolved type so downstream code never
// has to special-case octet-stream again.
const EXTENSION_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
};

const GENERIC_TYPES = ['application/octet-stream', 'binary/octet-stream', ''];

/**
 * Resolves the effective mime type of an upload, returning null when it is not
 * one of the allowed types. Mutates file.mimetype on success so that a generic
 * upload is indistinguishable from a correctly labelled one downstream.
 */
const resolveMimeType = (file, allowed) => {
    if (allowed.includes(file.mimetype)) return file.mimetype;

    if (GENERIC_TYPES.includes(file.mimetype)) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const resolved = EXTENSION_TYPES[ext];
        if (resolved && allowed.includes(resolved)) {
            file.mimetype = resolved;
            return resolved;
        }
    }

    return null;
};

const makeFilter = (allowed, message) => (_req, file, cb) => {
    if (resolveMimeType(file, allowed)) return cb(null, true);
    cb(new ApiError(400, message));
};

const imageFilter = makeFilter(
    ALLOWED_IMAGE_TYPES,
    'Only JPEG, PNG, WEBP, GIF images are allowed',
);

const videoFilter = makeFilter(
    ALLOWED_VIDEO_TYPES,
    'Only MP4, MOV, WEBM videos are allowed',
);

const mediaFilter = makeFilter(ALLOWED_MEDIA_TYPES, 'Unsupported media type');

// Store uploads on disk temporarily to avoid RAM exhaustion on large files
const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadImage = multer({
    storage: diskStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: imageFilter,
});

const uploadVideo = multer({
    storage: diskStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: videoFilter,
});

const uploadMedia = multer({
    storage: diskStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: mediaFilter,
});

/**
 * Deletes the temp file multer wrote when the request does not reach the
 * handler that would have consumed it.
 *
 * Multer runs before validation, so a body that fails its Joi schema leaves the
 * uploaded file in os.tmpdir() with nothing left holding a reference to it.
 * Mount as error middleware after the routes.
 */
const cleanupOrphanedUpload = async (err, req, _res, next) => {
    const files = req.file ? [req.file] : (req.files || []);
    await Promise.all(
        files.filter(Boolean).map((f) =>
            fs.unlink(f.path).catch((unlinkErr) => {
                if (unlinkErr.code !== 'ENOENT') {
                    logger.warn(`Failed to clean up orphaned upload ${f.path}: ${unlinkErr.message}`);
                }
            }),
        ),
    );
    next(err);
};

module.exports = { uploadImage, uploadVideo, uploadMedia, cleanupOrphanedUpload };
