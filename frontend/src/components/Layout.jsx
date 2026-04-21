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
    { to: '/shorts', icon: HiFilm, label: 'Shorts' },
    { to: '/messages', icon: HiChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', icon: HiBell, label: 'Notifications', badge: true },
]

const mobileBottomLinksLeft = [
    { to: '/', icon: HiHome, exact: true },
    { to: '/search', icon: HiSearch },
]

const mobileBottomLinksRight = [
    { to: '/shorts', icon: HiFilm },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const { isDark, toggle } = useTheme()
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
    const [showMore, setShowMore] = useState(false)
    const moreRef = useRef(null)

    const navContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }

    const navItemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { type: 'spring', damping: 25, stiffness: 300 }
        }
    }

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
        }
    }, [location.pathname])

    useEffect(() => {
        // Apply locked state for dashboard layout
        document.documentElement.classList.add('layout-locked');
        return () => document.documentElement.classList.remove('layout-locked');
    }, []);


    const syncAllCounts = useCallback(async () => {
        if (!user) return
        try {
            const [notifRes, msgRes] = await Promise.all([
                api.get('/notifications/unread-count'),
                chatApi.get('unread-count')
            ])
            
            setUnreadCount(notifRes.data.count || 0)
            unreadRef.current = notifRes.data.count || 0
            
            // If user is already on messages, don't show the global badge
            const isAtMessages = window.location.pathname.startsWith('/messages')
            const count = msgRes.data.count || 0
            const displayCount = isAtMessages ? 0 : count
            
            setMsgCount(displayCount)
            msgRef.current = count 
        } catch (err) {
            console.warn('[Layout] Sync failed', err)
        }
    }, [user])

    useEffect(() => {
        const handleSync = () => syncAllCounts()
        window.addEventListener('peernet:sync-counts', handleSync)
        return () => window.removeEventListener('peernet:sync-counts', handleSync)
    }, [syncAllCounts])

    // Update display count when path changes (to clear badge if entering messages)
    useEffect(() => {
        if (location.pathname.startsWith('/messages')) {
            setMsgCount(0)
        } else {
            setMsgCount(msgRef.current)
        }
    }, [location.pathname])

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
                    <img src={notif.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.sender?.username || 'User'}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-accent flex items-center justify-center text-[10px] border-2 border-surface shadow-sm">
                        {typeEmoji[notif.type]}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-primary">
                        {notif.sender?.username} <span className="font-medium text-secondary">{typeText[notif.type]}</span>
                    </p>
                </div>
            </div>
        ), {
            className: 'glass-toast',
            style: { background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)' }
        })
    }, [navigate])

    const showMsgToast = useCallback((msg) => {
        const senderName = msg.sender?.username || 'Someone'
        const convoId = msg.conversationId
        const preview = msg.body?.length > 40 ? msg.body.slice(0, 40) + '…' : (msg.body || '📷 Photo')

        toast((t) => (
            <div onClick={() => { navigate(`/messages/${convoId || ''}`); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center text-[9px] border-2 border-surface shadow-sm">💬</div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-primary">{senderName}</p>
                    <p className="m-0 text-[12px] text-muted truncate">{preview}</p>
                </div>
            </div>
        ), {
            className: 'glass-toast',
            style: { background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)' }
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

    useEffect(() => {
        if (!showMore) return
        const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showMore])

    return (
        <div className="app-layout">
            <aside className="sidebar">
                {/* Top: Branding */}
                <div className="sidebar-logo-row">
                    <Link to="/" className="sidebar-brand">
                        <motion.img 
                            src={logoImg} 
                            alt="PeerNet" 
                            className="sidebar-brand-img"
                            whileHover={{ rotate: -5, scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        />
                        <span className="peernetLogo">PeerNet</span>
                    </Link>
                </div>

                {/* Middle: Main Navigation */}
                <motion.nav 
                    className="sidebar-nav"
                    variants={navContainerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {links.map(({ to, icon: Icon, label, exact, badge, msgBadge }) => (
                        <motion.div key={to} variants={navItemVariants}>
                            <NavLink 
                                to={to} 
                                end={exact} 
                                className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}
                            >
                                <motion.div 
                                    className="flex items-center gap-4 w-full"
                                    whileHover={{ x: 4 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                >
                                    <div className="ig-icon-wrap">
                                        <Icon className="ig-icon" />
                                        {badge && unreadCount > 0 && <span className="ig-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                        {msgBadge && msgCount > 0 && <span className="ig-badge ig-badge--msg">{msgCount > 9 ? '9+' : msgCount}</span>}
                                    </div>
                                    <span className="ig-label">{label}</span>
                                </motion.div>
                            </NavLink>
                        </motion.div>
                    ))}
                    
                    <motion.div variants={navItemVariants}>
                        <div 
                            className="ig-link w-full justify-start border-none bg-transparent text-left cursor-pointer" 
                            onClick={() => setShowCreate(true)}
                            role="button"
                        >
                            <motion.div 
                                className="flex items-center gap-4 w-full"
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                                <div className="ig-icon-wrap">
                                    <HiPlusCircle className="ig-icon" />
                                </div>
                                <span className="ig-label">Create</span>
                            </motion.div>
                        </div>
                    </motion.div>

                    {user?.role === 'admin' && (
                        <motion.div variants={navItemVariants}>
                            <NavLink 
                                to="/admin" 
                                className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}
                            >
                                <motion.div 
                                    className="flex items-center gap-4 w-full"
                                    whileHover={{ x: 4 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                >
                                    <div className="ig-icon-wrap">
                                        <HiShieldCheck className="ig-icon text-accent" />
                                    </div>
                                    <span className="ig-label">Admin Console</span>
                                </motion.div>
                            </NavLink>
                        </motion.div>
                    )}
                </motion.nav>

                {/* Bottom: Profile & Settings */}
                <div className="sidebar-footer">
                    {/* Profile Mini Card */}
                    <motion.div 
                        className="sidebar-profile-card"
                        onClick={() => navigate(`/profile/${user?._id}`)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <img src={avatarUrl} className="profile-card-avatar" alt="" />
                        <div className="profile-card-info">
                            <span className="profile-card-name">{user?.username}</span>
                            <span className="profile-card-role">{user?.role === 'admin' ? 'Super Admin' : 'Creator'}</span>
                        </div>
                    </motion.div>

                    <div className="sidebar-more-wrap" ref={moreRef}>
                        <AnimatePresence>
                            {showMore && (
                                <motion.div 
                                    className="ig-more-popup" 
                                    initial={{ opacity: 0, y: 12, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <button className="ig-more-item" onClick={() => { toggle(); setShowMore(false) }}>
                                        {isDark ? <HiSun size={20} className="text-accent" /> : <HiMoon size={20} />} 
                                        <span>Appearance</span>
                                    </button>
                                    <NavLink to="/settings" className="ig-more-item" onClick={() => setShowMore(false)}>
                                        <HiCog size={20} /> <span>Settings</span>
                                    </NavLink>
                                    <button className="ig-more-item" onClick={() => { setShowMore(false); setShowSwitcher(true) }}>
                                        <HiSwitchHorizontal size={20} /> <span>Accounts</span>
                                    </button>
                                    <div className="ig-more-divider" />
                                    <button className="ig-more-item text-error" onClick={handleLogout}>
                                        <HiLogout size={20} /> <span>Log out</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div 
                            className={`ig-link w-full justify-start border-none bg-transparent text-left cursor-pointer ${showMore ? 'ig-link--active' : ''}`} 
                            onClick={() => setShowMore(!showMore)}
                            role="button"
                            tabIndex={0}
                        >
                            <motion.div 
                                className="flex items-center gap-4 w-full"
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                                <div className="ig-icon-wrap">
                                    <HiMenu className="ig-icon" />
                                </div>
                                <span className="ig-label">More</span>
                            </motion.div>
                        </div>
                    </div>
                </div>

            </aside>

            <main className="main-col" ref={mainRef}>

                <header className="mobile-top-header px-4">
                    <Link to="/" className="flex items-center gap-2 no-underline">
                        <img src={logoImg} alt="PN" className="w-8 h-8 rounded-lg shadow-sm" />
                        <span className="t-h2 logo-gradient-text">PeerNet</span>
                    </Link>
                    <div className="mobile-top-actions">
                        <NavLink to="/notifications" className="relative">
                            <HiBell size={24} /> {unreadCount > 0 && <span className="mobile-badge bg-error border-2 border-surface">{unreadCount}</span>}
                        </NavLink>
                        <NavLink to="/messages" className="relative">
                            <HiChatAlt2 size={24} /> {msgCount > 0 && <span className="mobile-badge bg-accent border-2 border-surface">{msgCount}</span>}
                        </NavLink>
                    </div>
                </header>

                <div 
                    className={`layout-container ${(!['/messages', '/shorts'].some(p => location.pathname.startsWith(p))) ? 'content-wrap' : ''}`}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 1.01 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 30,
                                opacity: { duration: 0.2 } 
                            }}
                            className="page-transition-wrapper"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>

                    {/* Hide Footer on Messages, Shorts, and Admin pages for app-screen style */}
                    {!['/messages', '/shorts', '/admin'].some(p => location.pathname.startsWith(p)) && (
                        <footer className="site-footer">
                            <div className="site-footer__inner">
                                {/* Left: Brand + Links */}
                                <div className="site-footer__left">
                                    <Link to="/" className="site-footer__brand">
                                        <img src={logoImg} alt="PeerNet" className="site-footer__logo" />
                                        <span className="peernetLogo text-base">PeerNet</span>
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
                    )}
                </div>
            </main>

            <nav className="mobile-nav">
                {mobileBottomLinksLeft.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} className={({ isActive }) => isActive ? 'active' : ''}><Icon /></NavLink>
                ))}
                <button onClick={() => setShowCreate(true)} className="w-10 h-10 flex items-center justify-center border border-border-md rounded-xl bg-surface-1 shadow-sm"><HiPlusCircle size={28} /></button>
                {mobileBottomLinksRight.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} className={({ isActive }) => isActive ? 'active' : ''}><Icon /></NavLink>
                ))}
                <NavLink to={`/profile/${user?._id}`} className={({ isActive }) => isActive ? 'active' : ''}>
                    <img src={avatarUrl} alt="" className="w-[26px] h-[26px] rounded-full object-cover" />
                </NavLink>
            </nav>

            <AnimatePresence>
                {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
                {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
                {showSwitcher && <AccountSwitcherModal onClose={() => setShowSwitcher(false)} />}
            </AnimatePresence>
        </div>
    )
}
