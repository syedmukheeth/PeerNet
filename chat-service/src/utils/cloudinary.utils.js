'use strict';

const cloudinary = require('../config/cloudinary');
const ApiError = require('./ApiError');
const fs = require('fs');

/**
 * Upload a local file to Cloudinary and delete it after
 * @param {string} filePath
 * @param {object} options - cloudinary upload options
 * @returns {Promise<{secure_url, public_id, resource_type}>}
 */
const uploadToCloudinary = (filePath, options = {}) =>
    new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            filePath,
            { resource_type: 'auto', ...options },
            (error, result) => {
                fs.unlink(filePath, () => {}); // Ignore cleanup errors
                if (error) return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
                resolve({ secure_url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type });
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
