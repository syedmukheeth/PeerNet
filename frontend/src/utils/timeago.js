/**
 * Lightweight timeago formatter — avoids CommonJS/ESM issues with timeago.js
 */
export function timeago(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
