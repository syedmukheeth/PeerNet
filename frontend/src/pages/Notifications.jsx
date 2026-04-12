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

    const actionText = n.type === 'like' ? (n.entityModel === 'Comment' ? 'liked your comment.' : 'liked your post.') :
                     n.type === 'comment' ? 'commented on your post.' :
                     n.type === 'reply' ? 'replied to your comment.' :
                     n.type === 'follow' ? 'started following you.' : 'notified you.';

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: index * 0.02 }}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: 'var(--bg-primary)', cursor: 'pointer', position: 'relative'
            }}
        >
            <Link to={`/profile/${n.sender?._id}`} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                {!n.isRead && (
                    <div style={{
                        position: 'absolute', top: -2, right: -2, width: 12, height: 12,
                        borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-primary)'
                    }} />
                )}
            </Link>

            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                <Link to={`/profile/${n.sender?._id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {n.sender?.username}
                </Link>
                {n.sender?.isVerified && <HiBadgeCheck style={{ color: '#0095f6', fontSize: 14, marginLeft: 3, verticalAlign: 'middle', display: 'inline' }} />}
                <span style={{ marginLeft: 4 }}>{actionText}</span>
                <span style={{ color: '#8e8e8e', marginLeft: 6 }}>{formatTime(n.createdAt)}</span>
                
                {n.type === 'comment' && n.entityId?.body && (
                    <div style={{ color: '#8e8e8e', marginTop: 2, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.entityId.body}
                    </div>
                )}
            </div>

            <div style={{ flexShrink: 0 }}>
                {n.type === 'follow' ? (
                    <button
                        onClick={handleFollowBack}
                        style={{
                            background: followed ? 'transparent' : '#0095F6',
                            color: followed ? '#fff' : '#fff',
                            border: followed ? '1px solid #363636' : 'none',
                            borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                        }}
                    >
                        {followed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <Link to={n.targetUrl || '#'}>
                        <img 
                            src={n.thumbnail} 
                            style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover', border: '0.5px solid #262626' }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                        />
                        <div style={{ display: 'none', width: 44, height: 44, background: 'var(--hover)', borderRadius: 4, alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            {cfg.emoji}
                        </div>
                    </Link>
                ) : (
                    <HiChevronRight style={{ color: '#363636' }} />
                )}
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
