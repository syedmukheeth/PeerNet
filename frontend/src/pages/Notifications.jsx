import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { SOCKET_URL } from '../api/axios'
import { Link } from 'react-router-dom'
import { timeago } from '../utils/timeago'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import {
    HiBell, HiHeart, HiChatAlt2, HiUserAdd, HiCheck, HiBadgeCheck, HiAtSymbol
} from 'react-icons/hi'

/* ── type config ─────────────────────────────────────────── */
const typeConfig = {
    like: {
        icon: HiHeart,
        gradient: 'linear-gradient(135deg,#FF375F,#FF9500)',
        text: 'liked your post',
        emoji: '❤️',
    },
    comment: {
        icon: HiChatAlt2,
        gradient: 'linear-gradient(135deg,#6366F1,#A78BFA)',
        text: 'commented on your post',
        emoji: '💬',
    },
    follow: {
        icon: HiUserAdd,
        gradient: 'linear-gradient(135deg,#10B981,#06C8FF)',
        text: 'started following you',
        emoji: '👤',
    },
    mention: {
        icon: HiAtSymbol,
        gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
        text: 'mentioned you',
        emoji: '📣',
    },
}

/* ── Group notifications by time ──────────────────────────── */
function groupByTime(notifs) {
    const now = Date.now()
    const DAY = 86400000
    const WEEK = DAY * 7
    const groups = { today: [], thisWeek: [], earlier: [] }
    for (const n of notifs) {
        const diff = now - new Date(n.createdAt).getTime()
        if (diff < DAY) groups.today.push(n)
        else if (diff < WEEK) groups.thisWeek.push(n)
        else groups.earlier.push(n)
    }
    return groups
}

/* ── Single notification row ──────────────────────────────── */
function NotifRow({ n, index, onFollowBack }) {
    const cfg = typeConfig[n.type] || typeConfig.like
    const Icon = cfg.icon
    const avatar = n.sender?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${n.sender?.username}&background=6366F1&color=fff`
    const [followed, setFollowed] = useState(false)

    const handleFollowBack = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        setFollowed(true)
        try {
            await api.post(`/users/${n.sender?._id}/follow`)
            onFollowBack?.()
        } catch {
            setFollowed(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.06)',
                borderRadius: 12,
                transition: 'background 0.2s',
                cursor: 'default',
            }}
            whileHover={{ background: 'var(--hover)' }}
        >
            {/* Avatar + icon badge */}
            <Link to={`/profile/${n.sender?._id}`} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                    src={avatar}
                    alt={n.sender?.username}
                    style={{
                        width: 46, height: 46, borderRadius: '50%',
                        objectFit: 'cover', display: 'block',
                        border: '2px solid var(--border)',
                    }}
                />
                {/* Icon badge bottom-right */}
                <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: cfg.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}>
                    <Icon style={{ color: '#fff', fontSize: 10 }} />
                </div>
            </Link>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, lineHeight: 1.4, margin: 0, color: 'var(--text-1)' }}>
                    <Link
                        to={`/profile/${n.sender?._id}`}
                        style={{ fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none' }}
                    >
                        {n.sender?.username}
                    </Link>
                    {n.sender?.isVerified && (
                        <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13, marginLeft: 3, verticalAlign: 'middle' }} />
                    )}
                    <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 4 }}>{cfg.text}</span>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '3px 0 0', lineHeight: 1 }}>
                    {timeago(n.createdAt)}
                </p>
            </div>

            {/* Right action — thumbnail for posts, follow-back for follows */}
            <div style={{ flexShrink: 0 }}>
                {n.type === 'follow' ? (
                    !followed ? (
                        <motion.button
                            onClick={handleFollowBack}
                            style={{
                                background: 'var(--accent)',
                                color: '#fff', border: 'none',
                                borderRadius: 8, padding: '7px 16px',
                                fontSize: 13, fontWeight: 700,
                                cursor: 'pointer',
                            }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                        >
                            Follow
                        </motion.button>
                    ) : (
                        <span style={{
                            background: 'var(--hover)', color: 'var(--text-2)',
                            border: '1px solid var(--border-md)',
                            borderRadius: 8, padding: '7px 14px',
                            fontSize: 13, fontWeight: 600,
                            display: 'inline-block',
                        }}>
                            Following
                        </span>
                    )
                ) : n.post?.mediaUrl ? (
                    <Link to={n.post?._id ? `/posts/${n.post._id}` : '#'}>
                        <img
                            src={n.post.mediaUrl}
                            alt=""
                            style={{
                                width: 44, height: 44, borderRadius: 8,
                                objectFit: 'cover', display: 'block',
                                border: '1px solid var(--border)',
                            }}
                        />
                    </Link>
                ) : null}
            </div>
        </motion.div>
    )
}

/* ── Section header ───────────────────────────────────────── */
function SectionLabel({ label }) {
    return (
        <div style={{
            padding: '16px 16px 6px',
            fontSize: 13, fontWeight: 700,
            color: 'var(--text-3)',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
        }}>
            {label}
        </div>
    )
}

/* ── Skeleton row ─────────────────────────────────────────── */
function NotifSkeleton() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--hover)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '60%', borderRadius: 6, background: 'var(--hover)', marginBottom: 8 }} />
                <div style={{ height: 10, width: '30%', borderRadius: 6, background: 'var(--hover)' }} />
            </div>
        </div>
    )
}

/* ── Main component ───────────────────────────────────────── */
export default function Notifications() {
    useAuth()
    const [notifs, setNotifs] = useState([])
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(true)
    const [hasNew, setHasNew] = useState(false)
    const socketRef = useRef(null)

    const load = async () => {
        try {
            const { data } = await api.get('/notifications')
            setNotifs(data.data || [])
            setUnread(data.unreadCount || 0)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    useEffect(() => {
        load()

        // Real-time: subscribe to new_notification events
        const token = localStorage.getItem('accessToken')
        if (token) {
            socketRef.current = io(SOCKET_URL, {
                auth: { token },
                path: '/socket.io',
                transports: ['websocket', 'polling'],
            })
            socketRef.current.on('new_notification', (notif) => {
                setNotifs(prev => [{ ...notif, isRead: false }, ...prev])
                setUnread(u => u + 1)
                setHasNew(true)
            })
        }

        return () => {
            socketRef.current?.disconnect()
            socketRef.current = null
        }
    }, [])

    const markRead = async () => {
        await api.patch('/notifications/read').catch(() => { })
        setUnread(0)
        setNotifs(n => n.map(x => ({ ...x, isRead: true })))
        setHasNew(false)
    }

    // Auto-mark read when page opens after 1.5 seconds
    useEffect(() => {
        const t = setTimeout(() => {
            if (unread > 0) markRead()
        }, 1500)
        return () => clearTimeout(t)
    }, [unread])

    const groups = groupByTime(notifs)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}
        >
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 16px 12px',
                position: 'sticky', top: 0, zIndex: 10,
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6366F1,#A78BFA)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    }}>
                        <HiBell style={{ color: '#fff', fontSize: 20 }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
                            Notifications
                        </h1>
                        {unread > 0 && (
                            <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0, fontWeight: 600 }}>
                                {unread} new
                            </p>
                        )}
                    </div>
                </div>

                {unread > 0 && (
                    <motion.button
                        onClick={markRead}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'var(--hover)', border: '1px solid var(--border-md)',
                            borderRadius: 20, padding: '7px 14px',
                            fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                            cursor: 'pointer',
                        }}
                        whileHover={{ scale: 1.03, background: 'var(--border)' }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <HiCheck style={{ fontSize: 14 }} />
                        Mark all read
                    </motion.button>
                )}
            </div>

            {/* ── New notif flash indicator ── */}
            <AnimatePresence>
                {hasNew && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(167,139,250,0.12))',
                            borderBottom: '1px solid rgba(99,102,241,0.2)',
                            padding: '10px 20px',
                            fontSize: 13, color: 'var(--accent)', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: 'var(--accent)',
                            boxShadow: '0 0 6px var(--accent)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                        New notifications arrived
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Content ── */}
            {loading ? (
                <div style={{ padding: '8px 0' }}>
                    {[...Array(6)].map((_, i) => <NotifSkeleton key={i} />)}
                </div>
            ) : notifs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '80px 32px', gap: 16, textAlign: 'center',
                    }}
                >
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(167,139,250,0.15))',
                        border: '2px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 36,
                    }}>
                        🔔
                    </div>
                    <div>
                        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px' }}>
                            All caught up
                        </p>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                            When someone likes, comments or follows you,&lt;br /&gt;you&apos;ll see it here.
                        </p>
                    </div>
                </motion.div>
            ) : (
                <div style={{ padding: '8px 0' }}>
                    {groups.today.length > 0 && (
                        <>
                            <SectionLabel label="Today" />
                            {groups.today.map((n, i) => (
                                <NotifRow key={n._id} n={n} index={i} />
                            ))}
                        </>
                    )}
                    {groups.thisWeek.length > 0 && (
                        <>
                            <SectionLabel label="This Week" />
                            {groups.thisWeek.map((n, i) => (
                                <NotifRow key={n._id} n={n} index={groups.today.length + i} />
                            ))}
                        </>
                    )}
                    {groups.earlier.length > 0 && (
                        <>
                            <SectionLabel label="Earlier" />
                            {groups.earlier.map((n, i) => (
                                <NotifRow key={n._id} n={n} index={groups.today.length + groups.thisWeek.length + i} />
                            ))}
                        </>
                    )}
                </div>
            )}
        </motion.div>
    )
}
