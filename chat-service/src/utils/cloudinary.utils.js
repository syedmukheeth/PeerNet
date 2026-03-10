'use strict';

const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const ApiError = require('./ApiError');

/**
 * Upload a buffer to Cloudinary via upload_stream
 * @param {Buffer} buffer
 * @param {object} options - cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<{secure_url, public_id}>}
 */
const uploadToCloudinary = (buffer, options = {}) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', ...options },
            (error, result) => {
                if (error) return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            },
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId
 * @param {string} resourceType - image | video | raw
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
