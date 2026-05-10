import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
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
        <div className="px-4 pt-6 pb-2">
            <span className="text-[13px] font-bold text-muted uppercase tracking-tight">{label}</span>
        </div>
    )
}

function NotifRow({ n, index, onNavigate }) {
    const cfg = typeConfig[n.type] || typeConfig.like
    const avatar = n.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${n.sender?.username}&background=6366F1&color=fff`
    const [isFollowed, setIsFollowed] = useState(n.sender?.isFollowing || false)
    const [actionLoading, setActionLoading] = useState(false)

    const handleAction = async (e) => {
        e.preventDefault(); e.stopPropagation()
        if (n.type !== 'follow' || actionLoading) return
        const originalState = isFollowed
        setIsFollowed(!originalState)
        setActionLoading(true)
        try {
            if (originalState) await api.delete(`/users/${n.sender?._id}/follow`)
            else await api.post(`/users/${n.sender?._id}/follow`)
        } catch (err) { setIsFollowed(originalState) }
        finally { setActionLoading(false) }
    }

    const navTarget = n.targetUrl || (n.type === 'follow' ? `/profile/${n.sender?._id}` : `/posts/${n.targetId || n.entityId?._id || n.entityId}`)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.015, duration: 0.3 }}
            className={`notif-row ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => onNavigate(navTarget)}
        >
            <div className="notif-avatar-wrap" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}>
                <img src={avatar} alt="" className="notif-avatar" />
                {!n.isRead && <div className="notif-unread-dot" />}
            </div>

            <div className="notif-content">
                <div className="notif-text-wrap">
                    <span className="notif-username" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}>
                        {n.sender?.username || 'User'}
                        {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-0.5 text-[#0095F6] align-middle" size={14} />}
                    </span>
                    <span className="notif-action-text">
                        {n.type === 'comment' || n.type === 'reply' ? `commented: "${n.commentBody}"` : cfg.text}
                    </span>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                </div>
            </div>

            <div className="shrink-0 ml-3">
                {n.type === 'follow' ? (
                    <button 
                        onClick={handleAction}
                        className={isFollowed ? 'notif-btn-following' : 'notif-btn-follow'}
                        disabled={actionLoading}
                    >
                        {isFollowed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <div className="notif-thumbnail-wrap">
                        <img src={n.thumbnail} alt="" className="notif-thumbnail" />
                    </div>
                ) : (
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-2">
                        <cfg.icon size={16} className="text-muted" />
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default function Notifications() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [notifs, setNotifs] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [skip, setSkip] = useState(0)
    const LIMIT = 50
    const socket = useSocket(user)

    const loadNotifs = async (isMore = false) => {
        if (isMore) setLoadingMore(true)
        else setLoading(true)
        
        try {
            const currentSkip = isMore ? skip + LIMIT : 0
            const { data } = await api.get(`/notifications?limit=${LIMIT}&skip=${currentSkip}`)
            const newNotifs = data.data || []
            
            if (newNotifs.length < LIMIT) setHasMore(false)
            
            if (isMore) {
                setNotifs(prev => [...prev, ...newNotifs])
                setSkip(currentSkip)
            } else {
                setNotifs(newNotifs)
                setSkip(0)
                if (newNotifs.some(n => !n.isRead)) {
                    await api.patch('/notifications/read')
                    window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
                }
            }
        } catch (err) { console.error("Notification load failed", err) }
        finally { 
            setLoading(false)
            setLoadingMore(false)
        }
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

        const groups = {
            today: [],
            thisWeek: [],
            earlier: []
        }

        notifs.forEach(n => {
            const d = new Date(n.createdAt)
            const diff = now - d
            
            if (isNaN(diff) || diff < oneDay) {
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
                    <div className="skeleton h-8 w-40 rounded-lg opacity-40" />
                </header>
                <div className="space-y-1 px-1">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent">
                            <div className="skeleton size-12 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3.5 w-[70%] rounded-full" />
                                <div className="skeleton h-2.5 w-[30%] rounded-full opacity-30" />
                            </div>
                            <div className="skeleton w-20 h-8 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-dvh pb-20 bg-bg">
            {/* Header - Sticky IG Style */}
            <div className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border-subtle">
                <div className="l-main-col flex items-center justify-between px-4 py-3">
                    <h1 className="text-xl font-bold text-primary">Notifications</h1>
                    <button className="p-2 hover:bg-surface-hover rounded-full transition-all active:scale-90">
                        <HiDotsHorizontal size={20} className="text-primary" />
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
                            When someone likes or comments on your posts, you'll see them here.
                        </p>
                    </motion.div>
                ) : (
                    <div className="pb-10 pt-2">
                        {categorized.today.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="Today" />
                                {categorized.today.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.thisWeek.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="This Week" />
                                {categorized.thisWeek.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.earlier.length > 0 && (
                            <div className="mb-4">
                                <SectionHeader label="Earlier" />
                                {categorized.earlier.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
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

