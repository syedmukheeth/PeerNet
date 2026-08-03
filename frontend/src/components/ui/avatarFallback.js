/*
 * Generated-avatar URL for users with no uploaded picture.
 *
 * Its own module so Avatar.jsx exports a component and nothing else, which is
 * what react-refresh needs to hot reload it.
 *
 * The background used to be hardcoded as 6366F1 (indigo) in twenty-one separate
 * places, none of which matched the app's blue accent.
 */
const FALLBACK_BG = '0095F6'

export const avatarFallback = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${FALLBACK_BG}&color=fff`

export default avatarFallback
