import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import {
    HiHeart, HiChatAlt2, HiUserAdd, HiBadgeCheck, HiAtSymbol, HiDotsHorizontal
} from 'react-icons/hi'

// Premium Time Formatter (IG Style)
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
    like: { icon: HiHeart, color: '#FF3B30', text: 'liked your post.' },
    comment: { icon: HiChatAlt2, color: '#5856D6', text: 'commented on your post.' },
    reply: { icon: HiChatAlt2, color: '#5856D6', text: 'replied to your comment.' },
    follow: { icon: HiUserAdd, color: '#34C759', text: 'started following you.' },
    mention: { icon: HiAtSymbol, color: '#FF9500', text: 'mentioned you in a post.' },
}

function SectionHeader({ label }) {
    return (
        <div className="px-4 py-4 mt-2">
            <span className="text-[15px] font-bold text-white/90">{label}</span>
        </div>
    )
}

function NotifRow({ n, index, onAction }) {
    const cfg = typeConfig[n.type] || typeConfig.like
    const avatar = n.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${n.sender?.username}&background=6366F1&color=fff`
    const [isFollowed, setIsFollowed] = useState(false)

    const handleAction = async (e) => {
        e.preventDefault(); e.stopPropagation()
        if (n.type === 'follow') {
            setIsFollowed(true)
            try { await api.post(`/users/${n.sender?._id}/follow`); onAction?.() }
            catch { setIsFollowed(false) }
        }
    }

    const actionText = (n.type === 'comment' || n.type === 'reply') && n.commentBody
        ? `${cfg.text.split(':')[0]} commented: "${n.commentBody}"`
        : cfg.text

    const navTarget = n.targetUrl || (n.type === 'follow' ? `/profile/${n.sender?._id}` : `/posts/${n.targetId || n.entityId?._id || n.entityId}`)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`notif-row ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => window.location.href = navTarget}
        >
            {/* Left: Avatar */}
            <div className="relative shrink-0">
                <img 
                    src={avatar} 
                    alt="" 
                    className="w-11 h-11 rounded-full object-cover border border-white/5"
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/profile/${n.sender?._id}` }}
                />
                {!n.isRead && (
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 unread-dot" />
                )}
            </div>

            {/* Middle: Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[14px] leading-[1.4]">
                    <span className="font-bold text-white hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); window.location.href = `/profile/${n.sender?._id}` }}>
                        {n.sender?.username}
                    </span>
                    {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-1 text-accent align-middle" size={14} />}
                    <span className="ml-1 text-white/80">{actionText}</span>
                    <span className="ml-1.5 text-white/40 whitespace-nowrap">{formatTime(n.createdAt)}</span>
                </div>
            </div>

            {/* Right: Interaction */}
            <div className="shrink-0 ml-2">
                {n.type === 'follow' ? (
                    <button 
                        onClick={handleAction}
                        className={`h-8 px-4 rounded-lg text-[13px] font-bold transition-all ${isFollowed ? 'bg-white/10 text-white/60' : 'bg-accent text-white hover:brightness-110'}`}
                    >
                        {isFollowed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <img 
                        src={n.thumbnail} 
                        alt="" 
                        className="notif-thumbnail"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                ) : null}
            </div>
        </motion.div>
    )
}

export default function Notifications() {
    const { user } = useAuth()
    const [notifs, setNotifs] = useState([])
    const [loading, setLoading] = useState(true)
    const socket = useSocket(user)

    const loadNotifs = async () => {
        try {
            const { data } = await api.get('/notifications')
            setNotifs(data.data || [])
            if (data.data?.some(n => !n.isRead)) {
                await api.patch('/notifications/read')
                window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
            }
        } catch (err) { console.error("Notification load failed", err) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadNotifs() }, [])

    useEffect(() => {
        if (!socket) return
        socket.on('new_notification', (notif) => {
            if (notif.sender?._id === user?._id) return
            setNotifs(prev => [notif, ...prev.filter(n => n._id !== notif._id)])
        })
        return () => socket.off('new_notification')
    }, [socket, user])

    const categorized = useMemo(() => {
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000
        const oneWeek = 7 * oneDay

        return {
            today: notifs.filter(n => (now - new Date(n.createdAt)) < oneDay),
            thisWeek: notifs.filter(n => {
                const diff = now - new Date(n.createdAt)
                return diff >= oneDay && diff < oneWeek
            }),
            earlier: notifs.filter(n => (now - new Date(n.createdAt)) >= oneWeek)
        }
    }, [notifs])

    if (loading) return (
        <div className="l-main-col py-10 flex justify-center">
            <span className="spinner-sm" />
        </div>
    )

    return (
        <div className="min-h-dvh pb-20">
            {/* Header */}
            <div className="l-main-col mt-4 mb-2 flex items-center justify-between px-4">
                <h1 className="text-[24px] font-black tracking-tight text-white">Notifications</h1>
                <button className="btn btn-ghost btn-icon-sm">
                    <HiDotsHorizontal size={20} />
                </button>
            </div>

            <div className="l-main-col max-w-[680px]">
                {notifs.length === 0 ? (
                    <div className="empty-state mt-24">
                        <div className="text-5xl mb-4 opacity-20">🔔</div>
                        <p className="t-h2 opacity-40">No notifications yet</p>
                        <p className="t-body opacity-30">Activity from your network will appear here.</p>
                    </div>
                ) : (
                    <div className="l-stack l-stack-sm">
                        {categorized.today.length > 0 && (
                            <div>
                                <SectionHeader label="Today" />
                                {categorized.today.map((n, i) => <NotifRow key={n._id} n={n} index={i} />)}
                            </div>
                        )}
                        {categorized.thisWeek.length > 0 && (
                            <div>
                                <SectionHeader label="This Week" />
                                {categorized.thisWeek.map((n, i) => <NotifRow key={n._id} n={n} index={i} />)}
                            </div>
                        )}
                        {categorized.earlier.length > 0 && (
                            <div>
                                <SectionHeader label="Earlier" />
                                {categorized.earlier.map((n, i) => <NotifRow key={n._id} n={n} index={i} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
