import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { Link } from 'react-router-dom'
import { timeago } from '../utils/timeago'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import {
    HiBell, HiHeart, HiChatAlt2, HiUserAdd, HiCheck, HiBadgeCheck, HiAtSymbol, HiOutlineSparkles
} from 'react-icons/hi'

// Global styles for notification animations
const styleSheet = `
@keyframes pulse-ring {
  0% { transform: scale(.33); opacity: 0; }
  80%, 100% { opacity: 0; }
}
@keyframes pulse-dot {
  0% { transform: scale(.8); }
  50% { transform: scale(1); }
  100% { transform: scale(.8); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('notif-styles')) {
    const s = document.createElement('style');
    s.id = 'notif-styles';
    s.innerHTML = styleSheet;
    document.head.appendChild(s);
}
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
    reply: {
        icon: HiChatAlt2,
        gradient: 'linear-gradient(135deg,#6366F1,#A78BFA)',
        text: 'replied to your comment',
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

    const getActionText = () => {
        if (n.type === 'like') {
            if (n.entityModel === 'Comment') return 'liked your comment'
            if (n.entityModel === 'Dscroll') return 'liked your dscroll'
            return 'liked your post'
        }
        if (n.type === 'comment') {
            if (n.entityModel === 'Dscroll') return 'commented on your dscroll'
            return 'commented on your post'
        }
        return cfg.text
    }

    const getThumbnail = () => {
        const e = n.entityId
        if (!e || typeof e !== 'object') return null
        
        // If it's a comment or reply, the preview image should be the original post
        const target = (n.entityModel === 'Comment' && e.post) ? e.post : e
        return target.mediaUrl || target.thumbnailUrl || target.videoUrl
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.04)',
                borderRadius: 16,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                border: n.isRead ? '1px solid transparent' : '1px solid rgba(99,102,241,0.15)',
                marginBottom: 2
            }}
            whileHover={{ 
                background: 'var(--hover)',
                transform: 'translateX(4px)',
                border: '1px solid var(--border-md)'
            }}
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

            {/* Text Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-1)' }}>
                    <Link
                        to={`/profile/${n.sender?._id}`}
                        style={{ fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none' }}
                    >
                        {n.sender?.username}
                    </Link>
                    {n.sender?.isVerified && (
                        <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13, marginLeft: 3, verticalAlign: 'middle', display: 'inline-block' }} />
                    )}
                    <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 4 }}>{getActionText()}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>{timeago(n.createdAt)}</span>
                </div>

                {/* Instagram Style: Comment content preview */}
                {n.type === 'comment' && n.entityId?.body && (
                    <p style={{ 
                        margin: '2px 0 0', 
                        fontSize: 13, 
                        color: 'var(--text-2)', 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '4px 8px', 
                        borderRadius: 6,
                        borderLeft: '2px solid var(--border-md)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '90%'
                    }}>
                        "{n.entityId.body}"
                    </p>
                )}
            </div>

            {/* Premium Unread Indicator (Pulsing blue dot) */}
            {!n.isRead && (
                <div style={{ position: 'relative', margin: '0 8px', flexShrink: 0 }}>
                    <div style={{ 
                        position: 'absolute', top: -10, left: -10, right: -10, bottom: -10,
                        borderRadius: '50%', border: '2px solid var(--accent)',
                        animation: 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                    }} />
                    <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: 'var(--accent)', 
                        boxShadow: '0 0 10px var(--accent)',
                        animation: 'pulse-dot 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite'
                    }} />
                </div>
            )}

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
                ) : (n.entityId && typeof n.entityId === 'object') ? (
                    <Link to={(n.entityModel === 'Post' || n.entityModel === 'Dscroll' || (n.entityModel === 'Comment' && n.entityId.post)) ? `/posts/${(n.entityModel === 'Comment' ? n.entityId.post?._id : n.entityId._id)}` : '#'}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 10,
                            overflow: 'hidden', border: '1px solid var(--border)',
                            background: 'var(--hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                            <img
                                src={getThumbnail()}
                                alt=""
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const sibling = e.target.parentNode.querySelector('.fallback-icon');
                                    if (sibling) sibling.style.display = 'flex';
                                }}
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover', display: 'block',
                                }}
                            />
                            <div className="fallback-icon" style={{ display: 'none', color: 'var(--text-3)', fontSize: 18 }}>
                                {n.type === 'like' ? '❤️' : '💬'}
                            </div>
                        </div>
                    </Link>
                ) : n.entityId ? (
                    /* If entityId is still a string (unpopulated), show a subtle fallback icon */
                    <div style={{
                        width: 44, height: 44, borderRadius: 8,
                        background: 'var(--hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-3)', fontSize: 18, border: '1px solid var(--border)'
                    }}>
                        {n.type === 'like' ? '❤️' : '💬'}
                    </div>
                ) : null}
            </div>
        </motion.div>
    )
}

/* ── Section header ───────────────────────────────────────── */
function SectionLabel({ label }) {
    return (
        <div style={{
            padding: '24px 16px 8px',
            fontSize: 12, fontWeight: 800,
            color: 'var(--text-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 12
        }}>
            {label}
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        </div>
    )
}

/* ── Skeleton row ─────────────────────────────────────────── */
function NotifSkeleton() {
    return (
        <div style={{ 
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            opacity: 0.6
        }}>
            <div style={{ 
                width: 46, height: 46, borderRadius: '50%', 
                background: 'linear-gradient(90deg, var(--hover) 25%, var(--border) 50%, var(--hover) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear',
                flexShrink: 0 
            }} />
            <div style={{ flex: 1 }}>
                <div style={{ 
                    height: 12, width: '40%', borderRadius: 6, 
                    background: 'linear-gradient(90deg, var(--hover) 25%, var(--border) 50%, var(--hover) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear',
                    marginBottom: 8 
                }} />
                <div style={{ 
                    height: 10, width: '70%', borderRadius: 6, 
                    background: 'linear-gradient(90deg, var(--hover) 25%, var(--border) 50%, var(--hover) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear'
                }} />
            </div>
        </div>
    )
}

/* ── Main component ───────────────────────────────────────── */
export default function Notifications() {
    const { user } = useAuth()
    const [notifs, setNotifs] = useState([])
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(true)
    const [hasNew, setHasNew] = useState(false)
    const socket = useSocket(user)

    const load = async () => {
        try {
            const { data } = await api.get('/notifications')
            setNotifs(data.data || [])
            setUnread(data.unreadCount || 0)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const groupNotifs = () => {
        const today = [];
        const earlier = [];
        const now = new Date();
        
        notifs.forEach(n => {
            const date = new Date(n.createdAt);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) today.push(n);
            else earlier.push(n);
        });
        
        return { today, earlier };
    }

    useEffect(() => {
        load()
    }, [])

    useEffect(() => {
        if (!socket) return
        
        socket.on('new_notification', (notif) => {
            // Check if it's from ourselves (mostly for testing/robustness)
            if (notif.sender?._id === user?._id) return

            setNotifs(prev => [{ ...notif, isRead: false }, ...prev])
            setUnread(u => u + 1)
            setHasNew(true)
        })

        socket.on('notification_removed', (payload) => {
            setNotifs(prev => prev.filter(n => n._id !== payload.notificationId))
            // If it was an unread notif, decrement the count
            setUnread(u => Math.max(0, u - 1))
        })

        return () => {
            socket.off('new_notification')
            socket.off('notification_removed')
        }
    }, [socket, user])

    const markRead = async () => {
        try {
            await api.patch('/notifications/read')
            setUnread(0)
            setNotifs(n => n.map(x => ({ ...x, isRead: true })))
            setHasNew(false)
            // Tell the sidebar to refresh its badge count immediately
            window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
        } catch (err) {
            console.warn('Failed to mark notifications read:', err)
        }
    }

    // Auto-mark read when page opens
    useEffect(() => {
        if (unread > 0) {
            markRead()
        }
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '100px 32px', gap: 24, textAlign: 'center',
                    }}
                >
                    <div style={{ position: 'relative' }}>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            style={{
                                width: 100, height: 100, borderRadius: '50%',
                                background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(167,139,250,0.1))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 44, border: '1px solid rgba(99,102,241,0.2)'
                            }}
                        >
                            <HiOutlineSparkles style={{ color: 'var(--accent)', opacity: 0.6 }} />
                        </motion.div>
                        <div style={{
                            position: 'absolute', top: -5, right: -5,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--bg)', border: '2px solid var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                        }}>
                            ✅
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
                            You&apos;re all caught up!
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
                            Follow more creators or post a new scroll to keep the conversation going.
                        </p>
                    </div>
                    <Link 
                        to="/home"
                        style={{
                            background: 'var(--accent)', color: '#fff',
                            padding: '10px 24px', borderRadius: 20,
                            fontWeight: 700, textDecoration: 'none',
                            fontSize: 14, boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
                        }}
                    >
                        Explore PeerNet
                    </Link>
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
