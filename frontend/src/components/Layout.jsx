import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiLogout, HiLogin, HiCog, HiMenu, HiMoon, HiSun, HiShieldCheck, HiSwitchHorizontal, HiPlus
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
    const mobileMenuBtnRef = useRef(null)
    const mobilePopupRef = useRef(null)

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

    // Clear the badge when entering messages, restore it on the way out
    useEffect(() => {
        setMsgCount(location.pathname.startsWith('/messages') ? 0 : msgRef.current)
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
            
            // Invalidate conversations to update unread counts/previews
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            
            if (!location.pathname.startsWith('/messages')) showMsgToast(msg)
        }
        socket.on('new_message', onMsg)
        return () => socket.off('new_message', onMsg)
    }, [socket, user, location.pathname, showMsgToast, queryClient])

    useEffect(() => {
        if (!socket || !user) return
        
        const onStatusChange = ({ userId, isOnline, lastSeen }) => {
            // Update conversations list cache
            queryClient.setQueryData(['conversations'], (old) => {
                if (!old) return old
                return old.map(convo => {
                    const participants = convo.participants?.map(p => 
                        p._id === userId ? { ...p, isOnline, lastSeen } : p
                    )
                    return { ...convo, participants }
                })
            })

            // Also invalidate to be safe and get fresh data for other hooks
            queryClient.invalidateQueries({ queryKey: ['messages', { userId }] })
        }

        socket.on('user_status_change', onStatusChange)
        
        const onMessagesSeen = ({ conversationId, viewerId }) => {
            if (viewerId === user?._id) return
            queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) return old
                return old.map(m => {
                    const isMe = m.sender?._id === user?._id || m.sender === 'me'
                    if (isMe && m.status !== 'seen') {
                        return { ...m, status: 'seen' }
                    }
                    return m
                })
            })
        }
        socket.on('messages_seen', onMessagesSeen)

        return () => {
            socket.off('user_status_change', onStatusChange)
            socket.off('messages_seen', onMessagesSeen)
        }
    }, [socket, user, queryClient])

    useEffect(() => {
        if (user) saveCurrentAccount(user)
    }, [user, saveCurrentAccount])

    const handleLogout = async () => { await logout(); navigate('/login') }
    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    useEffect(() => {
        if (!showMore) return
        const h = (e) => { 
            // Desktop check
            if (moreRef.current && moreRef.current.contains(e.target)) return
            
            // Mobile check
            if (mobileMenuBtnRef.current && mobileMenuBtnRef.current.contains(e.target)) return
            if (mobilePopupRef.current && mobilePopupRef.current.contains(e.target)) return

            setShowMore(false) 
        }
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
                        <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                        <span className="peernetLogo">PeerNet</span>
                    </Link>
                </div>

                {/* Middle: Main Navigation */}
                <nav className="sidebar-nav">
                    {links.map(({ to, icon: Icon, activeIcon: ActiveIcon, label, exact, badge, msgBadge }) => (
                        <NavLink
                            key={to}
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
                                <>
                                    <div className="ig-icon-wrap">
                                        {isActive ? <ActiveIcon className="ig-icon" /> : <Icon className="ig-icon" />}
                                        {badge && unreadCount > 0 && <span className="ig-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                        {msgBadge && msgCount > 0 && <span className="ig-badge ig-badge--msg">{msgCount > 9 ? '9+' : msgCount}</span>}
                                    </div>
                                    <span className={`ig-label ${isActive ? 'font-bold' : ''}`}>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}

                    {user && (
                        <button className="ig-link" onClick={() => setShowCreate(true)} type="button">
                            <div className="ig-icon-wrap">
                                <HiOutlinePlusCircle className="ig-icon" />
                            </div>
                            <span className="ig-label">Create</span>
                        </button>
                    )}

                    {user?.role === 'admin' && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="ig-icon-wrap">
                                        {isActive ? <HiShieldCheck className="ig-icon text-accent" /> : <HiOutlineShieldCheck className="ig-icon" />}
                                    </div>
                                    <span className={`ig-label ${isActive ? 'font-bold' : ''}`}>Admin Console</span>
                                </>
                            )}
                        </NavLink>
                    )}
                </nav>

                {/* Bottom: Profile & Settings */}
                <div className="sidebar-footer">
                    {user ? (
                        <button
                            type="button"
                            className="sidebar-profile-card"
                            onClick={() => navigate(`/profile/${user._id}`)}
                        >
                            <img src={avatarUrl} className="profile-card-avatar" alt="" />
                            <div className="profile-card-info">
                                <span className="profile-card-name">{user.username}</span>
                                <span className="profile-card-role">{user.fullName || `@${user.username}`}</span>
                            </div>
                        </button>
                    ) : (
                        <Link to="/login" className="ig-link">
                            <div className="ig-icon-wrap"><HiLogin className="ig-icon" /></div>
                            <span className="ig-label">Log in</span>
                        </Link>
                    )}

                    <div className="sidebar-more-wrap" ref={moreRef}>
                        <button
                            type="button"
                            className={`ig-link ${showMore ? 'ig-link--active' : ''}`}
                            onClick={() => setShowMore(!showMore)}
                            aria-expanded={showMore}
                            aria-label="More options"
                        >
                            <div className="ig-icon-wrap">
                                <HiMenu className="ig-icon" />
                            </div>
                            <span className="ig-label">More</span>
                        </button>

                        <AnimatePresence>
                            {showMore && (
                                <motion.div
                                    className="ig-more-popup desktop-only"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <button className="ig-more-item" onClick={() => { toggle(); setShowMore(false) }}>
                                        {isDark ? <HiSun size={20} /> : <HiMoon size={20} />}
                                        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                                    </button>
                                    {user && (
                                        <NavLink to="/settings" className="ig-more-item" onClick={() => setShowMore(false)}>
                                            <HiCog size={20} /> <span>Settings</span>
                                        </NavLink>
                                    )}
                                    {user?.role === 'admin' && (
                                        <NavLink to="/admin" className="ig-more-item" onClick={() => setShowMore(false)}>
                                            <HiShieldCheck size={20} /> <span>Admin Console</span>
                                        </NavLink>
                                    )}
                                    {user && (
                                        <button className="ig-more-item" onClick={() => { setShowMore(false); setShowSwitcher(true) }}>
                                            <HiSwitchHorizontal size={20} /> <span>Switch account</span>
                                        </button>
                                    )}
                                    <div className="ig-more-divider" />
                                    {user ? (
                                        <button className="ig-more-item text-error" onClick={handleLogout}>
                                            <HiLogout size={20} /> <span>Log out</span>
                                        </button>
                                    ) : (
                                        <Link to="/login" className="ig-more-item" onClick={() => setShowMore(false)}>
                                            <HiLogin size={20} /> <span>Log in</span>
                                        </Link>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                </aside>
            )}



            <header className="mobile-top-header">
                <div className="flex items-center gap-3">
                    <button
                        ref={mobileMenuBtnRef}
                        className="mobile-header-btn"
                        aria-label="Open menu"
                        aria-expanded={showMore}
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowMore(!showMore)
                        }}
                    >
                        <HiMenu size={24} />
                    </button>
                    <Link to="/" className="flex items-center gap-2 no-underline">
                        <img src={logoImg} alt="" className="w-8 h-8 rounded-lg" />
                        <span className="mobile-peernet-logo text-lg font-bold text-primary">PeerNet</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/notifications" className="relative text-primary p-1" aria-label="Notifications">
                        <HiOutlineBell size={24} />
                        {unreadCount > 0 && <span className="mobile-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </Link>
                    <Link to="/messages" className="relative text-primary p-1" aria-label="Messages">
                        <HiOutlineChatAlt2 size={24} />
                        {msgCount > 0 && <span className="mobile-badge">{msgCount > 9 ? '9+' : msgCount}</span>}
                    </Link>
                </div>

                {/* Mobile More Popup (Absolute positioned to the top left) */}
                <AnimatePresence>
                    {showMore && (
                        <motion.div
                            ref={mobilePopupRef}
                            className="mobile-more-popup"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="mobile-more-header">
                                <span>Menu</span>
                                <button onClick={() => setShowMore(false)} className="mobile-more-close" aria-label="Close menu">×</button>
                            </div>
                            <button className="mobile-more-item" onClick={() => { toggle(); setShowMore(false) }}>
                                {isDark ? <HiSun size={20} /> : <HiMoon size={20} />}
                                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                            </button>
                            {user && (
                                <NavLink to="/settings" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                    <HiCog size={20} /> <span>Settings</span>
                                </NavLink>
                            )}
                            {user?.role === 'admin' && (
                                <NavLink to="/admin" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                    <HiShieldCheck size={20} /> <span>Admin Console</span>
                                </NavLink>
                            )}
                            {user && (
                                <button className="mobile-more-item" onClick={() => { setShowMore(false); setShowSwitcher(true) }}>
                                    <HiSwitchHorizontal size={20} /> <span>Switch account</span>
                                </button>
                            )}
                            <div className="mobile-more-divider" />
                            {user ? (
                                <button className="mobile-more-item text-error" onClick={handleLogout}>
                                    <HiLogout size={20} /> <span>Log out</span>
                                </button>
                            ) : (
                                <Link to="/login" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                    <HiLogin size={20} /> <span>Log in</span>
                                </Link>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>


            <main className={`main-col ${['/messages', '/shorts'].some(p => location.pathname.startsWith(p)) ? 'h-full overflow-hidden' : ''} ${location.pathname.startsWith('/admin') ? 'main-col--admin' : ''}`} ref={mainRef}>
                <div 
                    className={`layout-container ${['/messages', '/shorts'].some(p => location.pathname.startsWith(p)) ? 'h-full' : ''} ${(!['/messages', '/shorts', '/admin'].some(p => location.pathname.startsWith(p))) ? 'content-wrap' : ''}`}
                >

                    <div className={['/messages', '/shorts'].some(p => location.pathname.startsWith(p)) ? 'h-full' : ''}>
                        <Outlet />
                    </div>

                    {/* Site footer */}
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
                    {user && (
                        <button className="mobile-nav-item" onClick={() => setShowCreate(true)} aria-label="Create post">
                            <HiPlus size={30} className="border-2 border-primary rounded-lg p-0.5" />
                        </button>
                    )}
                    <NavLink to="/shorts" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        {({ isActive }) => isActive ? <HiFilm size={28} /> : <HiOutlineFilm size={28} />}
                    </NavLink>
                    {user ? (
                        <NavLink to={`/profile/${user._id}`} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                            <img src={avatarUrl} className={`w-7 h-7 rounded-full border-2 ${location.pathname.includes(`/profile/${user._id}`) ? 'border-primary' : 'border-transparent'}`} alt="" />
                        </NavLink>
                    ) : (
                        <NavLink to="/login" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} aria-label="Log in">
                            <HiLogin size={28} />
                        </NavLink>
                    )}
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
