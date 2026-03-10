'use strict';

const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOC_SIZE = 50 * 1024 * 1024;    // 50MB

const imageFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'Only JPEG, PNG, WEBP, GIF images are allowed'));
};

const videoFilter = (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'Only MP4, MOV, WEBM videos are allowed'));
};

const mediaFilter = (_req, file, cb) => {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'Unsupported media type'));
};

// All uploads are stored in memory as Buffer (piped to Cloudinary directly)
const memoryStorage = multer.memoryStorage();

const uploadImage = multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: imageFilter,
});

const uploadVideo = multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: videoFilter,
});

const uploadMedia = multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: mediaFilter,
});

module.exports = { uploadImage, uploadVideo, uploadMedia };
