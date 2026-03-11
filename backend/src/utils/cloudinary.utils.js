'use strict';

const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const ApiError = require('./ApiError');

const fs = require('fs');

/**
 * Upload a local file to Cloudinary and delete it after
 * @param {string} filePath
 * @param {object} options - cloudinary upload options
 * @returns {Promise<{secure_url, public_id}>}
 */
const uploadToCloudinary = (filePath, options = {}) =>
    new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            filePath,
            { resource_type: 'auto', ...options },
            (error, result) => {
                // Ignore unlink errors to avoid crashing on cleanup failure
                fs.unlink(filePath, () => {});
                
                if (error) return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
        );
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
