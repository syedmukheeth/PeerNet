import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import api from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import { HiHeart, HiBadgeCheck, HiRefresh, Icon } from '../components/ui/icons'
import avatarFallback from '../components/ui/avatarFallback'
import { notificationCopy, isSystemNotification } from '../utils/notificationCopy'
import NotificationThumb from '../components/NotificationThumb'
import Skeleton from '../components/ui/Skeleton'

// Compact relative time, e.g. "3h", "2d"
const formatTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
};

// The copy and icon for every type now live in utils/notificationCopy, shared
// with the toast in Layout.jsx so the two cannot describe the same event
// differently.

// A comment quoted in a row is clamped: bodies run to 300 chars (Comment.js)
// and an untruncated one pushed the timestamp off the row.
const COMMENT_CLAMP = 90

const clamp = (text) =>
    text.length > COMMENT_CLAMP ? `${text.slice(0, COMMENT_CLAMP).trimEnd()}...` : text

/*
 * The sticky header, shared by the loading branch and the loaded one.
 *
 * The loading state used to draw its own approximation: a static 32px bar at
 * pt-10 instead of this 64px sticky bar. So the entire page jumped vertically
 * the moment notifications arrived.
 */
function NotificationsHeader({ onRefresh }) {
    return (
        <div className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border-sm">
            <div className="l-main-col flex items-center justify-between px-5 h-16">
                <h1 className="text-2xl font-black text-primary tracking-tighter">Notifications</h1>
                {/* Was a dead control with no onClick and no label. Now it
                    does the one thing this header can usefully offer. */}
                <button
                    className="p-2 hover:bg-surface-hover rounded-full transition-all active:scale-90 disabled:opacity-40"
                    aria-label="Refresh notifications"
                    title="Refresh"
                    onClick={onRefresh}
                    disabled={!onRefresh}
                >
                    <HiRefresh size={22} className="text-primary" />
                </button>
            </div>
        </div>
    )
}

/*
 * The loading placeholder for one row.
 *
 * It renders `.notif-row` itself rather than an approximation of it, so the
 * 48px avatar, the 14px gap, the 12/16 padding and the 8px side margin all come
 * from the same CSS the real row uses and cannot drift from it. The previous
 * version was a bare flex div at gap-3 with a flat 80x32 block on the right,
 * where the real trailing element is a 44px square for every like and comment.
 */
function NotificationRowSkeleton({ trailing = 'thumb' }) {
    return (
        <li className="notif-row">
            <div className="notif-avatar-wrap">
                <Skeleton w={48} h={48} circle />
            </div>

            <div className="notif-content">
                <div className="notif-text-wrap">
                    <Skeleton h={13} w="72%" radius="var(--r-xs)" />
                    <Skeleton h={11} w="34%" radius="var(--r-xs)" style={{ marginTop: 7 }} />
                </div>
            </div>

            <div className="shrink-0 ml-3 notif-trailing">
                {trailing === 'button'
                    ? <Skeleton w={86} h={32} radius="var(--r-sm)" />
                    : <Skeleton w={44} h={44} radius="var(--r-xs)" />}
            </div>
        </li>
    )
}

function SectionHeaderSkeleton() {
    return (
        <div className="px-4 pt-6 pb-2">
            <Skeleton h={13} w={64} radius="var(--r-xs)" />
        </div>
    )
}

function SectionHeader({ label }) {
    return (
        <div className="px-4 pt-6 pb-2">
            <span className="text-[13px] font-bold text-muted uppercase tracking-tight">{label}</span>
        </div>
    )
}

function NotifRow({ n }) {
    const cfg = notificationCopy(n)
    const isSystem = isSystemNotification(n)
    // Likes on one post arrive grouped: `count` is the true total and `senders`
    // holds the first few for the avatar stack.
    const othersCount = Math.max(0, (n.count || 1) - 1)
    // Two avatars is the whole stack; a third at 44px is a smudge, and the
    // count already carries the scale.
    const stack = (n.senders || []).slice(0, 2)
    const avatar = n.sender?.avatarUrl || avatarFallback(n.sender?.username)
    const [isFollowed, setIsFollowed] = useState(n.sender?.isFollowing || false)
    const [actionLoading, setActionLoading] = useState(false)

    // Resync when the list refreshes. useState only reads its initial value
    // once, so a row that stayed mounted across a refetch kept showing the
    // follow state from whenever it first rendered.
    useEffect(() => {
        setIsFollowed(n.sender?.isFollowing || false)
    }, [n.sender?.isFollowing])

    const handleAction = async (e) => {
        e.preventDefault(); e.stopPropagation()
        if (n.type !== 'follow' || actionLoading) return
        const originalState = isFollowed
        setIsFollowed(!originalState)
        setActionLoading(true)
        try {
            if (originalState) await api.delete(`/users/${n.sender?._id}/follow`)
            else await api.post(`/users/${n.sender?._id}/follow`)
        } catch { setIsFollowed(originalState) }
        finally { setActionLoading(false) }
    }

    const navTarget = n.targetUrl || (n.type === 'follow' ? `/profile/${n.sender?._id}` : `/posts/${n.targetId || n.entityId?._id || n.entityId}`)

    const verb = n.type === 'reply' ? 'replied' : 'commented'
    const actionText = (n.type === 'comment' || n.type === 'reply') && n.commentBody
        ? `${verb}: "${clamp(n.commentBody)}"`
        : cfg.text

    /*
     * The row used to be a click-handled div with two more click-handled
     * elements nested inside it, stopping propagation to distinguish them. None
     * of the three was focusable or keyboard-activatable.
     *
     * They are now real links, laid out with the stretched-link pattern: the
     * main link's ::after covers the row, so clicking anywhere still opens the
     * notification, while the avatar link and the follow button sit above it.
     * Nothing is nested inside anything else.
     */
    return (
        <li className={`notif-row ${!n.isRead ? 'notif-unread' : ''}`}>
            {stack.length > 1 ? (
                // A grouped row shows who, not just how many.
                <div className="notif-avatar-wrap notif-avatar-stack" aria-hidden="true">
                    {stack.map((s, i) => (
                        <img
                            key={s._id || i}
                            src={s.avatarUrl || avatarFallback(s.username)}
                            alt=""
                            className="notif-avatar"
                            style={{ zIndex: stack.length - i }}
                        />
                    ))}
                    {!n.isRead && <div className="notif-unread-dot" />}
                </div>
            ) : (
                <Link
                    to={`/profile/${n.sender?._id}`}
                    className="notif-avatar-wrap"
                    aria-label={`${n.sender?.username || 'User'}'s profile`}
                >
                    <img src={avatar} alt="" className="notif-avatar" />
                    {!n.isRead && <div className="notif-unread-dot" />}
                </Link>
            )}

            <div className="notif-content">
                <div className="notif-text-wrap">
                    {isSystem ? (
                        // A moderation warning is the message itself, not
                        // somebody acting on your content, so it is not
                        // prefixed with a username and does not link anywhere.
                        <span className="notif-action-text">{actionText}</span>
                    ) : (
                        <Link to={navTarget} className="notif-main-link">
                            <span className="notif-username">
                                {n.sender?.username || 'User'}
                                {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-0.5 text-accent align-middle" size={14} />}
                            </span>
                            {othersCount > 0 && (
                                <span className="notif-action-text">
                                    {' and '}
                                    {othersCount.toLocaleString()}
                                    {othersCount === 1 ? ' other' : ' others'}
                                </span>
                            )}
                            {' '}
                            <span className="notif-action-text">{actionText}</span>
                        </Link>
                    )}
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                </div>
            </div>

            <div className="shrink-0 ml-3 notif-trailing">
                {n.type === 'follow' ? (
                    <button
                        onClick={handleAction}
                        className={isFollowed ? 'notif-btn-following' : 'notif-btn-follow'}
                        disabled={actionLoading}
                        aria-label={`${isFollowed ? 'Unfollow' : 'Follow'} ${n.sender?.username || 'this user'}`}
                        aria-pressed={isFollowed}
                    >
                        {isFollowed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail || n.thumbnailType === 'text' ? (
                    <NotificationThumb notification={n} />
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-2 border border-border-sm">
                        <Icon name={cfg.icon} size={18} style={{ color: cfg.color }} />
                    </div>
                )}
            </div>
        </li>
    )
}

export default function Notifications() {
    const { user } = useAuth()
    const [notifs, setNotifs] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    /*
     * The endpoint is cursor-paginated: parsePagination (utils/pagination.utils)
     * reads `limit` and `cursor` and has never read `skip`. This page sent
     * `skip`, so every "load more" silently re-requested page one and appended
     * a second copy of it. The API returns `nextCursor` and `hasMore` and both
     * were being discarded.
     *
     * Held in a ref, not state, so advancing the cursor does not re-create
     * loadNotifs and re-trigger the mount effect.
     */
    const cursorRef = useRef(null)
    const LIMIT = 50
    const socket = useSocket(user)

    const loadNotifs = useCallback(async (isMore = false) => {
        if (isMore) setLoadingMore(true)
        else setLoading(true)

        try {
            const cursor = isMore ? cursorRef.current : null
            const query = cursor
                ? `/notifications?limit=${LIMIT}&cursor=${encodeURIComponent(cursor)}`
                : `/notifications?limit=${LIMIT}`
            const { data } = await api.get(query)
            const newNotifs = data.data || []

            cursorRef.current = data.nextCursor || null
            setHasMore(Boolean(data.hasMore && data.nextCursor))

            if (isMore) {
                // Guard against a duplicate anyway: a live socket insert can
                // land in the list between the request and its response.
                setNotifs(prev => {
                    const seen = new Set(prev.map(n => n._id))
                    return [...prev, ...newNotifs.filter(n => !seen.has(n._id))]
                })
            } else {
                setNotifs(newNotifs)
                if (newNotifs.some(n => !n.isRead)) {
                    await api.patch('/notifications/read')
                    window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
                    // The server rows are read now, so clear the local flags
                    // too. They were left set, so the unread dots stayed lit
                    // until the next full refetch.
                    setNotifs(prev => prev.map(n => (n.isRead ? n : { ...n, isRead: true })))
                }
            }
        } catch (err) {
            console.error('Notification load failed', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [])

    useEffect(() => { loadNotifs(false) }, [loadNotifs])

    useEffect(() => {
        if (!socket) return

        const handleNotification = (notif) => {
            if (notif.sender?._id === user?._id) return
            setNotifs(prev => [notif, ...prev.filter(n => n._id !== notif._id)])
        }

        // The server deletes the notification when someone unlikes a post or
        // unfollows, and emits this. Nothing listened, so the row sat there
        // claiming an event that had been undone until the next refetch.
        const handleRemoval = ({ notificationId }) => {
            setNotifs(prev => prev.filter(n => n._id !== notificationId))
        }

        socket.on('new_notification', handleNotification)
        socket.on('notification_removed', handleRemoval)
        // Named handlers, because socket.off('new_notification') with no second
        // argument removes every listener for the event, including the one
        // Layout registers for the global toast and the unread badge. Visiting
        // this page once and leaving used to kill both until a full reload.
        return () => {
            socket.off('new_notification', handleNotification)
            socket.off('notification_removed', handleRemoval)
        }
    }, [socket, user?._id])

    const categorized = useMemo(() => {
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000
        const oneWeek = 7 * oneDay

        const groups = {
            today: [],
            thisWeek: [],
            earlier: []
        }

        notifs.forEach(n => {
            const d = new Date(n.createdAt)
            const diff = now - d
            
            // An unparseable date is not "today". Bucketing it there put
            // notifications of unknown age at the top of the list.
            if (Number.isNaN(diff)) {
                groups.earlier.push(n)
            } else if (diff < oneDay) {
                groups.today.push(n)
            } else if (diff < oneWeek) {
                groups.thisWeek.push(n)
            } else {
                groups.earlier.push(n)
            }
        })

        return groups
    }, [notifs])

    if (loading) return (
        <div className="min-h-dvh pb-24 bg-bg">
            <NotificationsHeader />
            <div className="l-main-col">
                <SectionHeaderSkeleton />
                <ul className="notif-list" aria-busy="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <NotificationRowSkeleton key={i} trailing={i % 4 === 0 ? 'button' : 'thumb'} />
                    ))}
                </ul>
            </div>
        </div>
    )

    return (
        <div className="min-h-dvh pb-24 bg-bg">
            <NotificationsHeader onRefresh={() => loadNotifs(false)} />

            <div className="l-main-col">
                {notifs.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center mt-32 text-center px-4"
                    >
                        <div className="w-20 h-20 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center mb-6">
                            <HiHeart size={40} className="text-muted opacity-20" />
                        </div>
                        <h2 className="text-xl font-bold text-primary mb-2">No notifications yet</h2>
                        <p className="text-muted text-[14.5px] max-w-[260px] leading-relaxed">
                            When someone likes or comments on your posts, you&apos;ll see them here.
                        </p>
                    </motion.div>
                ) : (
                    <div className="pb-10 pt-2">
                        {categorized.today.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="Today" />
                                <ul className="notif-list" aria-label="Today">
                                    {categorized.today.map((n) => <NotifRow key={n._id} n={n} />)}
                                </ul>
                            </div>
                        )}
                        {categorized.thisWeek.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="This Week" />
                                <ul className="notif-list" aria-label="This week">
                                    {categorized.thisWeek.map((n) => <NotifRow key={n._id} n={n} />)}
                                </ul>
                            </div>
                        )}
                        {categorized.earlier.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="Earlier" />
                                <ul className="notif-list" aria-label="Earlier">
                                    {categorized.earlier.map((n) => <NotifRow key={n._id} n={n} />)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {hasMore && notifs.length > 0 && (
                    <div className="flex justify-center py-10 border-t border-border-subtle">
                        <button 
                            onClick={() => loadNotifs(true)}
                            disabled={loadingMore}
                            className="text-[14px] font-bold text-primary hover:opacity-70 transition-opacity disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'Show more'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

