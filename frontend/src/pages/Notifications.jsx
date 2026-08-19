import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import api from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import { HiHeart, HiChatAlt2, HiUserAdd, HiBadgeCheck, HiAtSymbol, HiRefresh } from '../components/ui/icons'
import avatarFallback from '../components/ui/avatarFallback'

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

const typeConfig = {
    // Colours come from tokens.css so they follow the theme. These were
    // hard-coded hex literals, the one place in the app that bypassed the
    // token system.
    like: { icon: HiHeart, color: 'var(--notif-like)', text: 'liked your post.' },
    comment: { icon: HiChatAlt2, color: 'var(--notif-comment)', text: 'commented on your post.' },
    reply: { icon: HiChatAlt2, color: 'var(--notif-comment)', text: 'replied to your comment.' },
    follow: { icon: HiUserAdd, color: 'var(--notif-follow)', text: 'started following you.' },
    mention: { icon: HiAtSymbol, color: '#FF9500', text: 'mentioned you in a post.' },
}

function SectionHeader({ label }) {
    return (
        <div className="px-4 pt-6 pb-2">
            <span className="text-[13px] font-bold text-muted uppercase tracking-tight">{label}</span>
        </div>
    )
}

function NotifRow({ n }) {
    const cfg = typeConfig[n.type] || typeConfig.like
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

    const actionText = (n.type === 'comment' || n.type === 'reply') && n.commentBody
        ? `commented: "${n.commentBody}"`
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
            <Link
                to={`/profile/${n.sender?._id}`}
                className="notif-avatar-wrap"
                aria-label={`${n.sender?.username || 'User'}'s profile`}
            >
                <img src={avatar} alt="" className="notif-avatar" />
                {!n.isRead && <div className="notif-unread-dot" />}
            </Link>

            <div className="notif-content">
                <div className="notif-text-wrap">
                    <Link to={navTarget} className="notif-main-link">
                        <span className="notif-username">
                            {n.sender?.username || 'User'}
                            {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-0.5 text-accent align-middle" size={14} />}
                        </span>
                        {' '}
                        <span className="notif-action-text">{actionText}</span>
                    </Link>
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
                ) : n.thumbnail ? (
                    <div className="notif-thumbnail-wrap">
                        <img src={n.thumbnail} alt="" className="notif-thumbnail" />
                    </div>
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-2 border border-border-sm">
                        <cfg.icon size={18} style={{ color: cfg.color }} />
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
    // Held in a ref, not state: the paging cursor must not re-create loadNotifs,
    // or the mount effect would refetch page 0 on every page load.
    const skipRef = useRef(0)
    const LIMIT = 50
    const socket = useSocket(user)

    const loadNotifs = useCallback(async (isMore = false) => {
        if (isMore) setLoadingMore(true)
        else setLoading(true)

        try {
            const currentSkip = isMore ? skipRef.current + LIMIT : 0
            const { data } = await api.get(`/notifications?limit=${LIMIT}&skip=${currentSkip}`)
            const newNotifs = data.data || []

            // Reset as well as clear. hasMore was only ever set to false, so
            // once a session had paged to the end, a later reload of page 0
            // could not page again.
            setHasMore(newNotifs.length >= LIMIT)
            skipRef.current = currentSkip

            if (isMore) {
                setNotifs(prev => [...prev, ...newNotifs])
            } else {
                setNotifs(newNotifs)
                if (newNotifs.some(n => !n.isRead)) {
                    await api.patch('/notifications/read')
                    window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
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

        socket.on('new_notification', handleNotification)
        // Named handler, because socket.off('new_notification') with no second
        // argument removes every listener for the event, including the one
        // Layout registers for the global toast and the unread badge. Visiting
        // this page once and leaving used to kill both until a full reload.
        return () => socket.off('new_notification', handleNotification)
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
        <div className="min-h-screen bg-bg">
            <div className="l-main-col pt-10">
                <header className="px-5 mb-8">
                    <div className="skeleton h-8 w-40 rounded-lg" />
                </header>
                <div className="space-y-1 px-1">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent">
                            <div className="skeleton size-12 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3.5 w-[70%] rounded-full" />
                                <div className="skeleton h-2.5 w-[30%] rounded-full" />
                            </div>
                            <div className="skeleton w-20 h-8 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-dvh pb-24 bg-bg">
            {/* Header - Sticky IG Style */}
            <div className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border-sm">
                <div className="l-main-col flex items-center justify-between px-5 h-16">
                    <h1 className="text-2xl font-black text-primary tracking-tighter">Notifications</h1>
                    {/* Was a dead control with no onClick and no label. Now it
                        does the one thing this header can usefully offer. */}
                    <button
                        className="p-2 hover:bg-surface-hover rounded-full transition-all active:scale-90"
                        aria-label="Refresh notifications"
                        title="Refresh"
                        onClick={() => loadNotifs(false)}
                    >
                        <HiRefresh size={22} className="text-primary" />
                    </button>
                </div>
            </div>

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

