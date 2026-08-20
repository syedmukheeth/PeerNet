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
// A falsy url returns '' rather than the falsy input itself. Returning undefined
// made React drop the src attribute, which is how text posts (which have no
// mediaUrl) rendered as empty grey squares in the profile grid rather than
// failing visibly.
export const optimizeCloudinaryUrl = (url, width = 800) => {
    if (!url) return '';
    if (!url.includes('res.cloudinary.com')) return url;

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
    if (!url) return '';
    if (!url.includes('res.cloudinary.com')) return url;

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
    if (!url) return '';
    if (!url.includes('res.cloudinary.com')) return url;
    return optimizeCloudinaryUrl(url, 150);
};

/**
 * A still frame from a Cloudinary video, for use in an <img>.
 *
 * Notification rows and other thumbnails were given the raw video URL as an
 * <img src>, which never renders: a browser will not decode an mp4 as an
 * image, so those tiles were always broken. Cloudinary will render a poster
 * frame if the delivery extension is an image one, so this swaps it.
 *
 * @param {string} url - The original Cloudinary video URL
 * @param {number} width - Target width for the still
 * @returns {string} A URL that resolves to an image, or '' when it cannot
 */
export const videoPosterUrl = (url, width = 200) => {
    if (!url) return '';
    if (!url.includes('res.cloudinary.com')) return '';

    const parts = url.split('/upload/');
    if (parts.length !== 2) return '';

    // Drop any existing extension; Cloudinary decides the format from the one
    // we ask for.
    const withoutExt = parts[1].replace(/\.[a-z0-9]+$/i, '');
    return `${parts[0]}/upload/so_0,q_auto,f_jpg,w_${width}/${withoutExt}.jpg`;
};
