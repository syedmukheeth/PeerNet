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
            <span className="text-[16px] font-bold tracking-tight text-white/90">{label}</span>
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
            if (originalState) {
                await api.delete(`/users/${n.sender?._id}/follow`)
            } else {
                await api.post(`/users/${n.sender?._id}/follow`)
            }
        } catch (err) {
            setIsFollowed(originalState)
        } finally {
            setActionLoading(false)
        }
    }

    const actionText = (n.type === 'comment' || n.type === 'reply') && n.commentBody
        ? `commented: "${n.commentBody}"`
        : cfg.text

    const navTarget = n.targetUrl || (n.type === 'follow' ? `/profile/${n.sender?._id}` : `/posts/${n.targetId || n.entityId?._id || n.entityId}`)

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02, ease: "easeOut" }}
            className={`notif-row ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => onNavigate(navTarget)}
        >
            {/* Left: Avatar */}
            <div className="notif-avatar-wrap">
                <img 
                    src={avatar} 
                    alt="" 
                    className="notif-avatar"
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}
                />
                {!n.isRead && <div className="notif-unread-dot" />}
            </div>

            {/* Middle: Content */}
            <div className="notif-content">
                <div className="notif-text">
                    <span className="notif-username" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${n.sender?._id}`) }}>
                        {n.sender?.username}
                    </span>
                    {n.sender?.isVerified && <HiBadgeCheck className="inline-block ml-1 text-[#0095F6] align-middle" size={14} />}
                    <span className="notif-action"> {actionText}</span>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                </div>
            </div>

            {/* Right: Interaction */}
            <div className="shrink-0 ml-auto">
                {n.type === 'follow' ? (
                    <button 
                        onClick={handleAction}
                        disabled={actionLoading}
                        className={`notif-action-btn ${isFollowed ? 'notif-btn-following' : 'notif-btn-follow'} ${actionLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {isFollowed ? 'Following' : 'Follow'}
                    </button>
                ) : n.thumbnail ? (
                    <div className="notif-thumbnail-wrap">
                        <img 
                            src={n.thumbnail} 
                            alt="" 
                            className="notif-thumbnail"
                            onError={(e) => e.target.parentElement.style.display = 'none'}
                        />
                    </div>
                ) : null}
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
        <div className="l-main-col pt-10">
            <h1 className="text-[24px] font-black tracking-tight px-4 mb-4">Notifications</h1>
            <div className="l-stack l-stack-sm">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="notif-row opacity-50">
                        <div className="skeleton skeleton-avatar" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="skeleton skeleton-text m" />
                            <div className="skeleton skeleton-text s" />
                        </div>
                        <div className="skeleton w-[80px] h-[32px] rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="min-h-dvh pb-20 bg-black">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-bottom border-white/5 py-4">
                <div className="l-main-col flex items-center justify-between px-4">
                    <h1 className="text-[24px] font-bold tracking-tight">Notifications</h1>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <HiDotsHorizontal size={20} />
                    </button>
                </div>
            </div>

            <div className="l-main-col mx-auto max-w-[680px] mt-2">
                {notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-32 text-center px-4">
                        <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center mb-6">
                            <HiHeart size={48} className="opacity-20" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">No notifications yet</h2>
                        <p className="text-[#a8a8a8] max-w-xs">When someone likes or comments on one of your posts, you'll see it here.</p>
                    </div>
                ) : (
                    <div className="pb-10">
                        {categorized.today.length > 0 && (
                            <div>
                                <SectionHeader label="Today" />
                                {categorized.today.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.thisWeek.length > 0 && (
                            <div>
                                <SectionHeader label="This Week" />
                                {categorized.thisWeek.map((n, i) => <NotifRow key={n._id} n={n} index={i} onNavigate={navigate} />)}
                            </div>
                        )}
                        {categorized.earlier.length > 0 && (
                            <div>
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
