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
        <div className="px-5 pt-8 pb-3">
            <span className="text-[13px] font-black tracking-[0.2em] uppercase text-muted/60">{label}</span>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.4 }}
            className={`notif-row group ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => onNavigate(navTarget)}
        >
            <div className="notif-avatar-wrap" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}>
                <img src={avatar} alt="" className="notif-avatar border-2 border-white/5 group-hover:border-accent/30 transition-all" />
                {!n.isRead && <div className="notif-unread-dot" />}
            </div>

            <div className="notif-content">
                <div className="text-[14px] leading-tight">
                    <span className="font-black text-primary hover:text-accent transition-colors cursor-pointer mr-1" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}>
                        {n.sender?.username || 'User'}
                        {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-1 text-accent align-middle" size={14} />}
                    </span>
                    <span className="text-primary/90 font-medium">
                        {n.type === 'comment' || n.type === 'reply' ? `commented: "${n.commentBody}"` : cfg.text}
                    </span>
                    <span className="text-muted/40 font-bold ml-2 text-[12px]">{formatTime(n.createdAt)}</span>
                </div>
            </div>

            <div className="shrink-0 ml-4">
                {n.type === 'follow' ? (
                    <button 
                        onClick={handleAction}
                        className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                            isFollowed 
                            ? 'bg-white/5 text-muted hover:bg-white/10' 
                            : 'bg-accent text-white shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95'
                        } ${actionLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {isFollowed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/5 bg-surface-subtle">
                        <img src={n.thumbnail} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-accent/10 transition-colors">
                        <cfg.icon size={18} className="text-muted/40 group-hover:text-accent transition-colors" />
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
                <header className="px-5 mb-12">
                    <div className="skeleton h-10 w-48 rounded-2xl opacity-40" />
                </header>
                <div className="space-y-4 px-2">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-[24px] border border-white/5 opacity-50">
                            <div className="skeleton size-14 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="skeleton h-4 w-[60%] rounded-full" />
                                <div className="skeleton h-3 w-[20%] rounded-full opacity-30" />
                            </div>
                            <div className="skeleton w-24 h-10 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-dvh pb-20 bg-bg">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-50 bg-bg/60 backdrop-blur-3xl border-b border-white/5">
                <div className="l-main-col flex items-center justify-between px-6 py-6">
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Notifications</h1>
                    <button className="p-2.5 hover:bg-white/5 rounded-xl transition-all active:scale-90">
                        <HiDotsHorizontal size={22} className="text-muted" />
                    </button>
                </div>
            </div>

            <div className="l-main-col">
                {notifs.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center mt-32 text-center px-4"
                    >
                        <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-center mb-10 relative group">
                            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <HiHeart size={48} className="text-muted/20 relative z-10" />
                        </div>
                        <h2 className="text-2xl font-black text-primary uppercase tracking-tighter mb-4">Pulse Registry Empty</h2>
                        <p className="text-muted font-bold text-sm max-w-[280px] leading-relaxed opacity-60 uppercase tracking-widest">
                            No social interactions recorded in the current cluster.
                        </p>
                    </motion.div>
                ) : (
                    <div className="pb-10">
                        {categorized.today.length > 0 && (
                            <div className="mb-2">
                                <SectionHeader label="Today" />
                                {categorized.today.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.thisWeek.length > 0 && (
                            <div className="mb-2">
                                <SectionHeader label="This Week" />
                                {categorized.thisWeek.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.earlier.length > 0 && (
                            <div className="mb-2">
                                <SectionHeader label="Earlier" />
                                {categorized.earlier.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                    </div>
                )}

                {hasMore && notifs.length > 0 && (
                    <div className="flex justify-center py-12 border-t border-white/5">
                        <button 
                            onClick={() => loadNotifs(true)}
                            disabled={loadingMore}
                            className="text-[14px] font-bold text-[#0095F6] hover:text-[#1877F2] transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'See older notifications'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
