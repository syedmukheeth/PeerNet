import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { Link } from 'react-router-dom'
import { timeago } from '../utils/timeago'
import { HiBell, HiHeart, HiChatAlt2, HiUserAdd, HiCheck, HiBadgeCheck } from 'react-icons/hi'

const typeConfig = {
    like: { icon: HiHeart, color: 'var(--error)', text: 'liked your post' },
    comment: { icon: HiChatAlt2, color: 'var(--accent)', text: 'commented on your post' },
    follow: { icon: HiUserAdd, color: 'var(--success)', text: 'started following you' },
}

const pageVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.25 } } }

export default function Notifications() {
    const [notifs, setNotifs] = useState([])
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/notifications').then(({ data }) => {
            setNotifs(data.data || [])
            setUnread(data.unreadCount || 0)
        }).finally(() => setLoading(false))
    }, [])

    const markRead = async () => {
        await api.patch('/notifications/read')
        setUnread(0)
        setNotifs(n => n.map(x => ({ ...x, isRead: true })))
    }

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
    )

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            <div className="page-header">
                <h1 className="t-heading" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <HiBell style={{ color: 'var(--accent)' }} />
                    Notifications
                    {unread > 0 && <span className="badge">{unread}</span>}
                </h1>
                {unread > 0 && (
                    <motion.button className="btn btn-ghost btn-sm"
                        onClick={markRead}
                        style={{ color: 'var(--accent)' }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <HiCheck /> Mark all read
                    </motion.button>
                )}
            </div>

            {notifs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <p className="empty-state-title">All caught up</p>
                    <p className="empty-state-desc">You'll see likes, comments and follows here</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {notifs.map((n, i) => {
                        const cfg = typeConfig[n.type] || typeConfig.like
                        const Icon = cfg.icon
                        const avatar = n.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${n.sender?.username}&background=6366F1&color=fff`
                        return (
                            <motion.div key={n._id}
                                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.22 }}>
                                <Link to={`/profile/${n.sender?._id}`}>
                                    <img src={avatar} className="avatar avatar-md" alt="" />
                                </Link>
                                <div className="notif-text">
                                    <strong>{n.sender?.username}</strong> {cfg.text}
                                    {n.sender?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13, marginLeft: 4 }} />}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                    <Icon style={{ fontSize: 18, color: cfg.color }} />
                                    <span className="notif-time">{timeago(n.createdAt)}</span>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </motion.div>
    )
}
