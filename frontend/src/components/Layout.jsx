import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiLogout, HiPlusCircle, HiCog, HiMenu, HiMoon, HiSun, HiShieldCheck, HiSwitchHorizontal
} from 'react-icons/hi'
import { useTheme } from '../context/ThemeContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useMultiAccount } from '../context/MultiAccountContext'
import CreatePostModal from './CreatePostModal'
import ThemeToggle from './ThemeToggle'
import FeedbackModal from './FeedbackModal'
import AccountSwitcherModal from './AccountSwitcherModal'
import { FaLinkedin } from 'react-icons/fa'
import logoImg from '../assets/logo.png'

const links = [
    { to: '/', icon: HiHome, label: 'Home', exact: true },
    { to: '/search', icon: HiSearch, label: 'Search' },
    { to: '/dscrolls', icon: HiFilm, label: 'Dscrolls' },
    { to: '/messages', icon: HiChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', icon: HiBell, label: 'Notifications', badge: true },
]

const mobileBottomLinksLeft = [
    { to: '/', icon: HiHome, exact: true },
    { to: '/search', icon: HiSearch },
]

const mobileBottomLinksRight = [
    { to: '/dscrolls', icon: HiFilm },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const { isDark } = useTheme()
    const { saveCurrentAccount } = useMultiAccount()
    const navigate = useNavigate()
    const location = useLocation()
    const socket = useSocket(user)

    const [showCreate, setShowCreate] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [showSwitcher, setShowSwitcher] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [msgCount, setMsgCount] = useState(0)
    const unreadRef = useRef(0)
    const msgRef = useRef(0)
    const mainRef = useRef(null)

    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }, [location.pathname])

    const syncAllCounts = useCallback(async () => {
        if (!user) return
        try {
            const [notifRes, msgRes] = await Promise.all([
                api.get('/notifications/unread-count'),
                chatApi.get('unread-count')
            ])
            setUnreadCount(notifRes.data.count || 0)
            unreadRef.current = notifRes.data.count || 0
            setMsgCount(msgRes.data.count || 0)
            msgRef.current = msgRes.data.count || 0
        } catch (err) {
            console.warn('[Layout] Sync failed', err)
        }
    }, [user])

    useEffect(() => {
        const handleSync = () => syncAllCounts()
        window.addEventListener('peernet:sync-counts', handleSync)
        return () => window.removeEventListener('peernet:sync-counts', handleSync)
    }, [syncAllCounts])

    const showNotifToast = useCallback((notif) => {
        const typeEmoji = { like: '❤️', comment: '💬', follow: '👤', message: '💬', reply: '💬' }
        const typeText = { 
            like: notif.entityModel === 'Comment' ? 'liked your comment' : 'liked your post', 
            comment: 'commented on your post', 
            reply: 'replied to your comment',
            follow: 'started following you' 
        }
        const targetUrl = notif.targetUrl || '/notifications';

        toast((t) => (
            <div onClick={() => { navigate(targetUrl); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={notif.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.sender?.username || 'User'}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[10px] border-2 border-surface">
                        {typeEmoji[notif.type]}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13px] font-bold text-text-1">
                        {notif.sender?.username} <span className="font-normal text-text-2">{typeText[notif.type]}</span>
                    </p>
                </div>
            </div>
        ), {
            style: { background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border-md)', borderRadius: 16 }
        })
    }, [navigate])

    const showMsgToast = useCallback((msg) => {
        const senderName = msg.sender?.username || 'Someone'
        const convoId = msg.conversationId
        const preview = msg.body?.length > 40 ? msg.body.slice(0, 40) + '…' : (msg.body || '📷 Photo')

        toast((t) => (
            <div onClick={() => { navigate(`/messages/${convoId || ''}`); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] border-2 border-surface">💬</div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13px] font-bold text-text-1">{senderName}</p>
                    <p className="m-0 text-[12px] text-text-3 truncate">{preview}</p>
                </div>
            </div>
        ), {
            style: { background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border-md)', borderRadius: 16 }
        })
    }, [navigate])

    useEffect(() => {
        if (!socket || !user) return
        const onNewNotif = (notif) => { unreadRef.current += 1; setUnreadCount(unreadRef.current); showNotifToast(notif) }
        const onSync = () => syncAllCounts()
        const onConnect = () => { syncAllCounts(); socket.emit('ping_online') }

        socket.on('new_notification', onNewNotif)
        socket.on('sync_counts', onSync)
        socket.on('connect', onConnect)

        if (socket.connected) onConnect()

        return () => {
            socket.off('new_notification', onNewNotif)
            socket.off('sync_counts', onSync)
            socket.off('connect', onConnect)
        }
    }, [socket, user, syncAllCounts, showNotifToast])

    useEffect(() => {
        if (!socket || !user) return
        const onMsg = (msg) => {
            if (msg.sender?._id === user?._id) return
            msgRef.current += 1
            setMsgCount(msgRef.current)
            if (!location.pathname.startsWith('/messages')) showMsgToast(msg)
        }
        socket.on('new_message', onMsg)
        return () => socket.off('new_message', onMsg)
    }, [socket, user, location.pathname, showMsgToast])

    useEffect(() => {
        if (user) saveCurrentAccount(user)
    }, [user, saveCurrentAccount])

    const handleLogout = async () => { await logout(); navigate('/login') }
    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`
    const [showMore, setShowMore] = useState(false)
    const moreRef = useRef(null)

    useEffect(() => {
        if (!showMore) return
        const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showMore])

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo-row">
                    <Link to="/" className="sidebar-brand">
                        <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                        <span className="peernetLogo">PeerNet</span>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {links.map(({ to, icon: Icon, label, exact, badge, msgBadge }) => (
                        <NavLink key={to} to={to} end={exact} className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                            {({ isActive }) => (
                                <>
                                    <span className="ig-icon-wrap relative">
                                        <Icon className="ig-icon" style={{ opacity: isActive ? 1 : 0.55 }} />
                                        {badge && unreadCount > 0 && <span className="ig-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                        {msgBadge && msgCount > 0 && <span className="ig-badge ig-badge--msg">{msgCount > 9 ? '9+' : msgCount}</span>}
                                    </span>
                                    <span className="ig-label">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                    <button className="ig-link" onClick={() => setShowCreate(true)}>
                        <div className="ig-icon-wrap">
                            <HiPlusCircle className="ig-icon" style={{ opacity: 0.55 }} />
                        </div>
                        <span className="ig-label">Create</span>
                    </button>
                    <NavLink to={`/profile/${user?._id}`} className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                        <div className="ig-icon-wrap">
                            <img src={avatarUrl} className="ig-avatar" alt="" />
                        </div>
                        <span className="ig-label">Profile</span>
                    </NavLink>

                    {user?.role === 'admin' && (
                        <NavLink to="/admin" className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                            <div className="ig-icon-wrap">
                                <HiShieldCheck className="ig-icon text-accent" />
                            </div>
                            <span className="ig-label">Admin Console</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-more-wrap" ref={moreRef}>
                    <AnimatePresence>
                        {showMore && (
                            <motion.div 
                                className="ig-more-popup" 
                                initial={{ opacity: 0, y: 12, scale: 0.95 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            >
                                <button className="ig-more-item" onClick={() => { document.querySelector('.theme-toggle')?.click(); setShowMore(false) }}>
                                    {isDark ? <HiSun size={20} className="text-accent" /> : <HiMoon size={20} />} 
                                    <span>Switch appearance</span>
                                </button>
                                <NavLink to="/settings" className="ig-more-item" onClick={() => setShowMore(false)}>
                                    <HiCog size={20} /> <span>Settings</span>
                                </NavLink>
                                <button className="ig-more-item" onClick={() => { setShowMore(false); setShowSwitcher(true) }}>
                                    <HiSwitchHorizontal size={20} /> <span>Switch accounts</span>
                                </button>
                                <div className="ig-more-divider" />
                                <button className="ig-more-item text-error" onClick={handleLogout}>
                                    <HiLogout size={20} /> <span>Log out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button 
                        className={`ig-link ${showMore ? 'ig-link--active' : ''}`} 
                        onClick={() => setShowMore(!showMore)}
                    >
                        <div className="ig-icon-wrap">
                            <HiMenu className="ig-icon" />
                        </div>
                        <span className="ig-label">More</span>
                    </button>
                </div>
            </aside>

            <main className="main-col overflow-y-auto h-[100dvh]" ref={mainRef}>
                <header className="mobile-top-header">
                    <Link to="/" className="flex items-center gap-2 no-underline">
                        <img src={logoImg} alt="PN" className="w-7 h-7 rounded-lg" />
                        <span className="text-[18px] font-extrabold" style={{ background: 'var(--logo-gradient)', WebkitBackgroundClip: 'text', color: 'transparent' }}>PeerNet</span>
                    </Link>
                    <div className="mobile-top-actions">
                        <NavLink to="/notifications" className="relative">
                            <HiBell size={24} /> {unreadCount > 0 && <span className="mobile-badge bg-error">{unreadCount}</span>}
                        </NavLink>
                        <NavLink to="/messages" className="relative">
                            <HiChatAlt2 size={24} /> {msgCount > 0 && <span className="mobile-badge bg-accent">{msgCount}</span>}
                        </NavLink>
                    </div>
                </header>

                <div className="layout-container min-h-[calc(100dvh-120px)]">
                    <AnimatePresence mode="wait"><Outlet /></AnimatePresence>
                </div>

                <footer className="site-footer">
                    <div className="site-footer__inner">

                        {/* Left: Brand + Links */}
                        <div className="site-footer__left">
                            <Link to="/" className="site-footer__brand">
                                <img src={logoImg} alt="PeerNet" className="site-footer__logo" />
                                <span className="peernetLogo" style={{ fontSize: 16 }}>PeerNet</span>
                            </Link>
                            <p className="site-footer__tagline">
                                A professional network built for the next generation.
                            </p>
                            <div className="site-footer__links">
                                <Link to="/legal/privacy" className="site-footer__link">Privacy</Link>
                                <Link to="/legal/terms" className="site-footer__link">Terms</Link>
                                <button onClick={() => setShowFeedback(true)} className="site-footer__link">Report Bug</button>
                            </div>
                        </div>

                        {/* Right: Creator card */}
                        <div className="site-footer__right">
                            <a
                                href="https://www.linkedin.com/in/syedmukheeth"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="site-footer__creator-card"
                            >
                                <div className="site-footer__creator-inner">
                                    <FaLinkedin size={20} className="site-footer__li-icon" />
                                    <div>
                                        <p className="site-footer__creator-name">Syed Mukheeth</p>
                                        <p className="site-footer__creator-sub">Creator & Developer</p>
                                    </div>
                                </div>
                                <span className="site-footer__creator-cta">Connect ↗</span>
                            </a>
                        </div>

                    </div>
                    <div className="site-footer__bottom">
                        <span>© 2026 PeerNet</span>
                        <span className="site-footer__dot">·</span>
                        <span>Built with Passion in India 🇮🇳</span>
                    </div>
                </footer>
            </main>

            <nav className="mobile-nav">
                {mobileBottomLinksLeft.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} className={({ isActive }) => isActive ? 'active' : ''}><Icon /></NavLink>
                ))}
                <button onClick={() => setShowCreate(true)} className="w-9 h-9 flex items-center justify-center border border-border-md rounded-xl text-2xl"><HiPlusCircle size={28} /></button>
                {mobileBottomLinksRight.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} className={({ isActive }) => isActive ? 'active' : ''}><Icon /></NavLink>
                ))}
                <NavLink to={`/profile/${user?._id}`} className={({ isActive }) => isActive ? 'active' : ''}>
                    <img src={avatarUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                </NavLink>
            </nav>

            <AnimatePresence>
                {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
                {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
                {showSwitcher && <AccountSwitcherModal onClose={() => setShowSwitcher(false)} />}
            </AnimatePresence>
            <ThemeToggle className="sr-only" />
        </div>
    )
}
