/*
 * One description per notification type, for the list and the toast alike.
 *
 * There were two maps: one in pages/Notifications.jsx and one in
 * components/Layout.jsx, and they disagreed. The toast correctly said "liked
 * your comment" when the entity was a Comment; the list said "liked your post"
 * for the same notification.
 *
 * Worse, the list's map covered only five of the seven types in the schema
 * enum (Notification.js) and fell back with `typeConfig[n.type] || like`. So a
 * `system_warning` from a moderator rendered a red heart reading "liked your
 * post", with the actual warning text sitting unread in the `message` field.
 * A moderation warning that cannot be recognised as one is worse than no
 * warning at all, so there is no silent fallback here any more.
 */

const TYPES = {
    like: {
        icon: 'heart',
        color: 'var(--notif-like)',
        text: (n) => (n.entityModel === 'Comment' ? 'liked your comment.' : 'liked your post.'),
    },
    comment: {
        icon: 'comment',
        color: 'var(--notif-comment)',
        text: () => 'commented on your post.',
    },
    reply: {
        icon: 'comment',
        color: 'var(--notif-comment)',
        text: () => 'replied to your comment.',
    },
    follow: {
        icon: 'user-add',
        color: 'var(--notif-follow)',
        text: () => 'started following you.',
    },
    mention: {
        // Was a hardcoded #FF9500, the one colour in the feature that ignored
        // the theme.
        icon: 'at',
        color: 'var(--warning)',
        text: () => 'mentioned you in a post.',
    },
    message: {
        icon: 'message',
        color: 'var(--notif-comment)',
        text: () => 'sent you a message.',
    },
    system_warning: {
        icon: 'alert-circle',
        color: 'var(--warning)',
        text: (n) => n.message || 'sent you a warning.',
    },
}

const UNKNOWN = {
    icon: 'bell',
    color: 'var(--text-3)',
    text: () => 'sent you a notification.',
}

export function notificationCopy(n) {
    const cfg = TYPES[n?.type] || UNKNOWN
    return { icon: cfg.icon, color: cfg.color, text: cfg.text(n || {}) }
}

/*
 * A moderation warning is the message, not a person's action on your content,
 * so it is laid out differently: no thumbnail, no follow button, and the text
 * is not prefixed with a username.
 */
export const isSystemNotification = (n) => n?.type === 'system_warning'

export default notificationCopy
