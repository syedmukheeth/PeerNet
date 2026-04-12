import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { Link } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import {
    HiBell, HiHeart, HiChatAlt2, HiUserAdd, HiCheck, HiBadgeCheck, HiAtSymbol, HiOutlineSparkles, HiChevronRight
} from 'react-icons/hi'

// Premium Time Formatter (Instagram Style: 2m, 1h, 3w)
const formatTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000); // seconds

    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
};

const styleSheet = `
@keyframes pulse-ring {
  0% { transform: scale(.33); opacity: 0; }
  80%, 100% { opacity: 0; }
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
    like: { icon: HiHeart, gradient: 'linear-gradient(135deg,#FF375F,#FF9500)', emoji: '❤️' },
    comment: { icon: HiChatAlt2, gradient: 'linear-gradient(135deg,#6366F1,#A78BFA)', emoji: '💬' },
    reply: { icon: HiChatAlt2, gradient: 'linear-gradient(135deg,#6366F1,#A78BFA)', emoji: '💬' },
    follow: { icon: HiUserAdd, gradient: 'linear-gradient(135deg,#10B981,#06C8FF)', emoji: '👤' },
    mention: { icon: HiAtSymbol, gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', emoji: '📣' },
}

function SectionLabel({ label }) {
    return (
        <div style={{
            padding: '24px 16px 8px', fontSize: 13, fontWeight: 700, color: '#8e8e8e',
            letterSpacing: '0.02em'
        }}>{label}</div>
    )
}

function NotifRow({ n, index, onFollowBack }) {
    const cfg = typeConfig[n.type] || typeConfig.like
    const Icon = cfg.icon
    const avatar = n.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${n.sender?.username}&background=6366F1&color=fff`
    const [followed, setFollowed] = useState(false)

    const handleFollowBack = async (e) => {
        e.preventDefault(); e.stopPropagation()
        setFollowed(true)
        try { await api.post(`/users/${n.sender?._id}/follow`); onFollowBack?.() }
        catch { setFollowed(false) }
    }

    // Comment body from enriched backend payload (commentBody) or legacy entityId.body
    const commentBody = (n.type === 'comment' || n.type === 'reply')
        ? (n.commentBody || n.entityId?.body || null)
        : null;

    // Action text — include comment body inline, Instagram-style
    const actionText =
        n.type === 'like'    ? (n.entityModel === 'Comment' ? 'liked your comment.' : 'liked your post.') :
        n.type === 'comment' ? (commentBody ? `commented: "${commentBody}"` : 'commented on your post.') :
        n.type === 'reply'   ? (commentBody ? `replied: "${commentBody}"` : 'replied to your comment.') :
        n.type === 'follow'  ? 'started following you.' : 'notified you.';

    // Where clicking the row navigates
    const navTarget = n.targetUrl
        || (n.type === 'follow' ? `/profile/${n.sender?._id}` : `/posts/${n.targetId || n.entityId?._id || n.entityId}`)

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: index * 0.02 }}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: n.isRead ? 'transparent' : 'var(--accent-subtle)',
                cursor: 'pointer', position: 'relative',
                transition: 'background 200ms ease',
                borderBottom: '1px solid var(--border)',
            }}
            onClick={() => window.location.href = navTarget}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
            onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--accent-subtle)'}
        >
            {/* ── Sender Avatar + Type Badge ───────────────── */}
            <div
                onClick={e => { e.stopPropagation(); window.location.href = `/profile/${n.sender?._id}` }}
                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
            >
                <img src={avatar} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{
                    position: 'absolute', bottom: -2, right: -2, width: 20, height: 20,
                    borderRadius: '50%', background: cfg.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-primary)',
                }}>
                    <Icon style={{ color: '#fff', fontSize: 11 }} />
                </div>
                {!n.isRead && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: 10, height: 10,
                        borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-primary)'
                    }} />
                )}
            </div>

            {/* ── Text Content ──────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.45 }}>
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{n.sender?.username}</span>
                    {n.sender?.isVerified && <HiBadgeCheck style={{ color: '#0095f6', fontSize: 13, marginLeft: 3, verticalAlign: 'middle', display: 'inline' }} />}
                    {' '}
                    <span style={{ color: 'var(--text-2)' }}>{actionText}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{formatTime(n.createdAt)}</div>
            </div>

            {/* ── Right Side: Thumbnail / Follow Button ────── */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {n.type === 'follow' ? (
                    <button
                        onClick={handleFollowBack}
                        style={{
                            background: followed ? 'transparent' : 'var(--accent)',
                            color: '#fff', border: followed ? '1px solid var(--border-md)' : 'none',
                            borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'background 150ms'
                        }}
                    >
                        {followed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-md)', flexShrink: 0 }}>
                        <img
                            src={n.thumbnail}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { e.target.parentElement.style.display = 'none' }}
                        />
                    </div>
                ) : null /* text-only posts: no thumbnail, no emoji box clutter */}
            </div>
        </motion.div>
    )
}

function NotifSkeleton() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--hover)' }} />
            <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '60%', borderRadius: 4, background: 'var(--hover)' }} />
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--hover)' }} />
        </div>
    )
}

export default function Notifications() {
    const { user } = useAuth()
    const [notifs, setNotifs] = useState([])
    const [loading, setLoading] = useState(true)
    const socket = useSocket(user)

    const load = async () => {
        try {
            const { data } = await api.get('/notifications')
            setNotifs(data.data || [])
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    useEffect(() => {
        if (!socket) return
        socket.on('new_notification', (notif) => {
            if (notif.sender?._id === user?._id) return
            setNotifs(prev => {
                if (prev.find(x => x._id === notif._id)) return prev;
                return [{ ...notif, isRead: false }, ...prev];
            })
        })
        socket.on('notification_removed', (p) => setNotifs(prev => prev.filter(n => n._id !== p.notificationId)))
        return () => { socket.off('new_notification'); socket.off('notification_removed') }
    }, [socket, user])

    useEffect(() => {
        const mark = async () => {
            try { 
                await api.patch('/notifications/read')
                window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
            } catch {}
        }
        if (notifs.some(n => !n.isRead)) mark()
    }, [notifs])

    const now = new Date();
    const today = notifs.filter(n => (now - new Date(n.createdAt)) < 86400000);
    const earlier = notifs.filter(n => (now - new Date(n.createdAt)) >= 86400000);

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', color: 'var(--text-primary)', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ padding: '16px 16px 8px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Notifications</h1>
            </div>

            {loading ? (
                [...Array(8)].map((_, i) => <NotifSkeleton key={i} />)
            ) : notifs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🔔</div>
                    <p style={{ fontWeight: 600 }}>No notifications yet</p>
                </div>
            ) : (
                <div style={{ paddingBottom: 60 }}>
                    {today.length > 0 && (
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                            <SectionLabel label="Today" />
                            {today.map((n, i) => <NotifRow key={n._id} n={n} index={i} />)}
                        </div>
                    )}
                    {earlier.length > 0 && (
                        <div>
                            <SectionLabel label="Earlier" />
                            {earlier.map((n, i) => <NotifRow key={n._id} n={n} index={i} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
