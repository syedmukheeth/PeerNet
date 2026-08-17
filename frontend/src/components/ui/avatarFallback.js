/*
 * Generated-avatar URL for users with no uploaded picture.
 *
 * Its own module so Avatar.jsx exports a component and nothing else, which is
 * what react-refresh needs to hot reload it.
 *
 * The background used to be hardcoded as 6366F1 (indigo) in twenty-one separate
 * places, none of which matched the app's accent.
 *
 * The value is the light theme's vermilion rather than the dark theme's, since
 * white lettering clears 5.4:1 on it and only 2.9:1 on the lighter shade, and
 * the service renders one image for both themes.
 */
const FALLBACK_BG = 'C23A17'

export const avatarFallback = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${FALLBACK_BG}&color=fff`

export default avatarFallback
