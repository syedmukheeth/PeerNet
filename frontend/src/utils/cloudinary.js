/**
 * Utilities for optimizing Cloudinary media URLs on the fly.
 * This injects transformations to serve lightweight WebP/AVIF formats
 * and resize large images to save bandwidth and improve load times.
 */

/**
 * Optimizes a Cloudinary image URL.
 * Automatically converts format to WebP/AVIF and sets quality to auto.
 * @param {string} url - The original Cloudinary URL
 * @param {number} width - The target width (default 800 for post feed)
 * @returns {string} The optimized URL
 */
export const optimizeCloudinaryUrl = (url, width = 800) => {
    if (!url || !url.includes('res.cloudinary.com')) return url;

    // If it already has transformations, don't double inject
    if (url.includes('/upload/q_') || url.includes('/upload/f_')) return url;

    // Inject q_auto,f_auto,w_{width} after /upload/
    const parts = url.split('/upload/');
    if (parts.length === 2) {
        return `${parts[0]}/upload/q_auto,f_auto,w_${width}/${parts[1]}`;
    }
    return url;
};

/**
 * Optimizes a Cloudinary video URL.
 * @param {string} url - The original Cloudinary URL
 * @returns {string} The optimized URL
 */
export const optimizeCloudinaryVideo = (url) => {
    if (!url || !url.includes('res.cloudinary.com')) return url;

    if (url.includes('/upload/q_') || url.includes('/upload/f_')) return url;

    const parts = url.split('/upload/');
    if (parts.length === 2) {
        return `${parts[0]}/upload/q_auto,f_auto/${parts[1]}`;
    }
    return url;
};

/**
 * Super lightweight optimization specifically for small avatars.
 * @param {string} url - The original avatar URL
 * @returns {string} The optimized URL
 */
export const optimizeAvatarUrl = (url) => {
    // If it's a ui-avatars URL, it's already tiny and SVG/PNG.
    if (!url || !url.includes('res.cloudinary.com')) return url;
    return optimizeCloudinaryUrl(url, 150);
};
