import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiLogout, HiPlusCircle, HiCog, HiMenu, HiMoon, HiSun, HiShieldCheck, HiSwitchHorizontal, HiPlus
} from 'react-icons/hi'
import {
    HiOutlineHome, HiOutlineSearch, HiOutlineFilm, HiOutlineChatAlt2,
    HiOutlineBell, HiOutlinePlusCircle, HiOutlineShieldCheck
} from 'react-icons/hi'
import { useTheme } from '../context/ThemeContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { useMultiAccount } from '../context/MultiAccountContext'
import CreatePostModal from './CreatePostModal'
import FeedbackModal from './FeedbackModal'
import AccountSwitcherModal from './AccountSwitcherModal'
import { FaLinkedin } from 'react-icons/fa'
import { useQueryClient } from '@tanstack/react-query'
import logoImg from '../assets/logo.png'

const links = [
    { to: '/', icon: HiOutlineHome, activeIcon: HiHome, label: 'Home', exact: true },
    { to: '/search', icon: HiOutlineSearch, activeIcon: HiSearch, label: 'Search' },
    { to: '/shorts', icon: HiOutlineFilm, activeIcon: HiFilm, label: 'Shorts' },
    { to: '/messages', icon: HiOutlineChatAlt2, activeIcon: HiChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', icon: HiOutlineBell, activeIcon: HiBell, label: 'Notifications', badge: true },
]



export default function Layout() {
    const { user, logout } = useAuth()
    const { isDark, toggle } = useTheme()
    const { saveCurrentAccount } = useMultiAccount()
    const navigate = useNavigate()
    const location = useLocation()
    const socket = useSocket(user)
    const queryClient = useQueryClient()

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
            {!location.pathname.startsWith('/admin') && (
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
                    {links.map(({ to, icon: Icon, activeIcon: ActiveIcon, label, exact, badge, msgBadge }) => (
                        <motion.div key={to} variants={navItemVariants}>
                            <NavLink 
                                to={to} 
                                end={exact} 
                                className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}
                                onMouseEnter={() => {
                                    if (to === '/messages') {
                                        queryClient.prefetchQuery({ queryKey: ['convos'] })
                                        const lastId = localStorage.getItem('zn_last_convo_id')
                                        if (lastId) {
                                            queryClient.prefetchQuery({ queryKey: ['messages', lastId] })
                                        }
                                    }
                                }}
                            >
                                {({ isActive }) => (
                                    <motion.div 
                                        className="flex items-center gap-4 w-full"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                    >
                                        <div className="ig-icon-wrap">
                                            {isActive ? <ActiveIcon className="ig-icon" /> : <Icon className="ig-icon" />}
                                            {badge && unreadCount > 0 && <span className="ig-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                            {msgBadge && msgCount > 0 && <span className="ig-badge ig-badge--msg">{msgCount > 9 ? '9+' : msgCount}</span>}
                                        </div>
                                        <span className={`ig-label ${isActive ? 'font-black' : ''}`}>{label}</span>
                                    </motion.div>
                                )}
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
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                                <div className="ig-icon-wrap">
                                    <HiOutlinePlusCircle className="ig-icon" />
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
                                {({ isActive }) => (
                                    <motion.div 
                                        className="flex items-center gap-4 w-full"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                    >
                                        <div className="ig-icon-wrap">
                                            {isActive ? <HiShieldCheck className="ig-icon text-accent" /> : <HiOutlineShieldCheck className="ig-icon" />}
                                        </div>
                                        <span className={`ig-label ${isActive ? 'font-black' : ''}`}>Admin Console</span>
                                    </motion.div>
                                )}
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

                        <AnimatePresence>
                            {showMore && (
                                <motion.div 
                                    className="ig-more-popup desktop-only" 
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
                                    {user?.role === 'admin' && (
                                        <NavLink to="/admin" className="ig-more-item" onClick={() => setShowMore(false)}>
                                            <HiShieldCheck size={20} /> <span>Admin Console</span>
                                        </NavLink>
                                    )}
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
                    </div>
                </div>
                </aside>
            )}



            <header className="mobile-top-header">
                <div className="flex items-center gap-3">
                    <div style={{ position: 'relative' }}>
                        <button 
                            className="mobile-header-btn bg-transparent border-none text-primary"
                            onClick={() => setShowMore(!showMore)}
                        >
                            <HiMenu size={24} />
                        </button>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-decoration-none">
                        <img src={logoImg} alt="" className="w-8 h-8 rounded-lg" />
                        <span className="mobile-peernet-logo text-lg font-black logo-gradient-text">PeerNet</span>
                    </Link>
                </div>
                
                <div className="flex items-center gap-4">
                    <Link to="/notifications" className="relative text-primary p-1">
                        <HiOutlineBell size={24} />
                        {unreadCount > 0 && <span className="mobile-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </Link>
                    <Link to="/messages" className="relative text-primary p-1">
                        <HiOutlineChatAlt2 size={24} />
                        {msgCount > 0 && <span className="mobile-badge">{msgCount > 9 ? '9+' : msgCount}</span>}
                    </Link>
                </div>

                {/* Mobile More Popup (Absolute positioned to the top left) */}
                <AnimatePresence>
                    {showMore && (
                        <motion.div 
                            className="mobile-more-popup"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="mobile-more-header">
                                <span className="font-bold">Menu</span>
                                <button onClick={() => setShowMore(false)} className="bg-transparent border-none text-primary">×</button>
                            </div>
                            <button className="mobile-more-item" onClick={() => { toggle(); setShowMore(false) }}>
                                {isDark ? <HiSun size={20} className="text-accent" /> : <HiMoon size={20} />} 
                                <span>Appearance</span>
                            </button>
                            <NavLink to="/settings" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                <HiCog size={20} /> <span>Settings</span>
                            </NavLink>
                            {user?.role === 'admin' && (
                                <NavLink to="/admin" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                    <HiShieldCheck size={20} /> <span>Admin Console</span>
                                </NavLink>
                            )}
                            <button className="mobile-more-item" onClick={() => { setShowMore(false); setShowSwitcher(true) }}>
                                <HiSwitchHorizontal size={20} /> <span>Accounts</span>
                            </button>
                            <div className="mobile-more-divider" />
                            <button className="mobile-more-item text-error" onClick={handleLogout}>
                                <HiLogout size={20} /> <span>Log out</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className={`main-col ${location.pathname.startsWith('/messages') ? 'h-full overflow-hidden' : ''} ${location.pathname.startsWith('/admin') ? 'main-col--admin' : ''}`} ref={mainRef}>
                <div 
                    className={`layout-container ${location.pathname.startsWith('/messages') ? 'h-full' : ''} ${(!['/messages', '/shorts', '/admin'].some(p => location.pathname.startsWith(p))) ? 'content-wrap' : ''}`}
                >

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname.split('/')[1] || 'root'}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 30,
                                opacity: { duration: 0.2 } 
                            }}
                            className={`page-transition-wrapper ${location.pathname.startsWith('/messages') ? 'h-full' : ''}`}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>

                    {/* Aesthetic Site Footer */}
                    {!['/messages', '/shorts', '/admin'].some(p => location.pathname.startsWith(p)) && (
                        <footer className="site-footer">
                            <div className="site-footer__inner">
                                <div className="site-footer__links">
                                    <Link to="/about" className="site-footer__link">About</Link>
                                    <span className="footer-dot" />
                                    <Link to="/help" className="site-footer__link">Help</Link>
                                    <span className="footer-dot" />
                                    <Link to="/legal/privacy" className="site-footer__link">Privacy</Link>
                                    <span className="footer-dot" />
                                    <Link to="/legal/terms" className="site-footer__link">Terms</Link>
                                    <span className="footer-dot" />
                                    <button onClick={() => setShowFeedback(true)} className="site-footer__link">Report Bug</button>
                                </div>
                                
                                <div className="site-footer__developer">
                                    <span className="dev-text">Developed by</span>
                                    <a
                                        href="https://www.linkedin.com/in/syedmukheeth"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="dev-link"
                                    >
                                        <FaLinkedin size={16} />
                                        <span>Syed Mukheeth</span>
                                    </a>
                                </div>

                                <div className="site-footer__copyright">
                                    © 2026 PEERNET FROM INDIA
                                </div>
                            </div>
                        </footer>
                    )}
                </div>
            </main>

            {!(location.pathname.startsWith('/messages/') && location.pathname.split('/').filter(Boolean).length > 1) && (
                <nav className="mobile-nav">
                    <NavLink to="/" end className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        {({ isActive }) => isActive ? <HiHome size={28} /> : <HiOutlineHome size={28} />}
                    </NavLink>
                    <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        {({ isActive }) => isActive ? <HiSearch size={28} /> : <HiOutlineSearch size={28} />}
                    </NavLink>
                    <button className="mobile-nav-item text-primary bg-transparent border-none" onClick={() => setShowCreate(true)}>
                        <HiPlus size={30} className="border-2 border-primary rounded-lg p-0.5" />
                    </button>
                    <NavLink to="/shorts" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        {({ isActive }) => isActive ? <HiFilm size={28} /> : <HiOutlineFilm size={28} />}
                    </NavLink>
                    <NavLink to={`/profile/${user?._id}`} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        <img src={avatarUrl} className={`w-7 h-7 rounded-full border-2 ${location.pathname.includes(`/profile/${user?._id}`) ? 'border-primary' : 'border-transparent'}`} alt="" />
                    </NavLink>
                </nav>
            )}

            <AnimatePresence>
                {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
                {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
                {showSwitcher && <AccountSwitcherModal onClose={() => setShowSwitcher(false)} />}
            </AnimatePresence>
        </div>
    )
}
