import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import {
    HiHeart, HiChatAlt2, HiUserAdd, HiBadgeCheck, HiAtSymbol
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
        <div className="px-4 pt-6 pb-2 text-[13px] font-bold text-muted uppercase tracking-wider">
            {label}
        </div>
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
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer relative border-b border-border transition-colors hover:bg-hover ${n.isRead ? '' : 'bg-accent-low'}`}
            onClick={() => window.location.href = navTarget}
        >
            {/* ── Sender Avatar + Type Badge ───────────────── */}
            <div
                onClick={e => { e.stopPropagation(); window.location.href = `/profile/${n.sender?._id}` }}
                className="relative shrink-0 cursor-pointer"
            >
                <img src={avatar} alt="" className="w-[46px] h-[46px] rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 border-bg"
                    style={{ background: cfg.gradient }}>
                    <Icon className="text-white text-[11px]" />
                </div>
                {!n.isRead && (
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg" />
                )}
            </div>

            {/* ── Text Content ──────────────────────────────── */}
            <div className="flex-1 min-w-0 leading-normal">
                <div className="text-[14px]">
                    <span className="font-bold text-primary">{n.sender?.username}</span>
                    {n.sender?.isVerified && <HiBadgeCheck className="text-accent text-[14px] ml-1 inline align-middle" />}
                    {' '}
                    <span className="text-secondary">{actionText}</span>
                </div>
                <div className="text-[12px] text-muted mt-1 font-medium">{formatTime(n.createdAt)}</div>
            </div>

            {/* ── Right Side: Thumbnail / Follow Button ────── */}
            <div className="shrink-0 flex items-center">
                {n.type === 'follow' ? (
                    <button
                        onClick={handleFollowBack}
                        className={`btn btn-sm min-w-[90px] ${followed ? 'btn-secondary' : 'btn-primary'}`}
                    >
                        {followed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <div className="w-[52px] h-[52px] rounded-lg overflow-hidden border border-border-md shrink-0">
                        <img
                            src={n.thumbnail}
                            className="w-full h-full object-cover block"
                            onError={e => { e.target.parentElement.style.display = 'none' }}
                            alt=""
                        />
                    </div>
                ) : null}
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
        } catch (err) { console.warn("Notif load fail", err) }
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
            } catch (err) { console.warn("Mark read fail", err) }
        }
        if (notifs.some(n => !n.isRead)) mark()
    }, [notifs])

    const now = new Date();
    const today = notifs.filter(n => (now - new Date(n.createdAt)) < 86400000);
    const earlier = notifs.filter(n => (now - new Date(n.createdAt)) >= 86400000);

    return (
        <div className="min-h-dvh max-w-[600px] mx-auto pb-20">
            <div className="px-4 py-6 border-b border-border mb-2">
                <h1 className="t-heading text-2xl">Notifications</h1>
            </div>

            {loading ? (
                [...Array(8)].map((_, i) => <NotifSkeleton key={i} />)
            ) : notifs.length === 0 ? (
                <div className="empty-state mt-20">
                    <div className="empty-state-icon text-muted opacity-40">🔔</div>
                    <p className="empty-state-title">No notifications yet</p>
                    <p className="empty-state-desc">When people interact with you, you'll see it here.</p>
                </div>
            ) : (
                <div>
                    {today.length > 0 && (
                        <div className="mb-4">
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
