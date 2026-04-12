import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiLogout, HiPlusCircle, HiCog, HiMenu, HiMoon, HiSun, HiUser
} from 'react-icons/hi'
import { useTheme } from '../context/ThemeContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import CreatePostModal from './CreatePostModal'
import ThemeToggle from './ThemeToggle'
import logoImg from '../assets/logo.png'

// Instagram-style nav: filled icon always, inactive = 0.55 opacity, active = full + bold
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
    const navigate = useNavigate()
    const location = useLocation()
    const socket = useSocket(user)

    const [showCreate, setShowCreate] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [msgCount, setMsgCount] = useState(0)
    const [isCollapsed] = useState(false)
    const unreadRef = useRef(0)
    const msgRef = useRef(0)
    const mainRef = useRef(null)

    // ── Scroll to top on route change ──────────────────────
    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }, [location.pathname])

    // ── Unified Sync (Big Tech Grade: Unified and Robust) ──────────────────
    const syncAllCounts = useCallback(async () => {
        if (!user) return
        
        console.group('🔄 [SYNC] Synchronization Started');
        
        // 1. Notifications Sync
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count || 0);
            unreadRef.current = res.data.count || 0;
            console.log('✅ [SYNC] Notifications:', res.data.count);
        } catch (err) {
            console.warn('❌ [SYNC] Notification fetch failed');
            console.table({
                message: err.message,
                url: `${api.defaults.baseURL}/notifications/unread-count`,
                status: err.response?.status,
                code: err.code
            });
        }

        // 2. Messages Sync
        try {
            const res = await chatApi.get('unread-count');
            setMsgCount(res.data.count || 0);
            msgRef.current = res.data.count || 0;
            console.log('✅ [SYNC] Messages:', res.data.count);
        } catch (err) {
            console.warn('❌ [SYNC] Message fetch failed');
            console.table({
                message: err.message,
                url: `${chatApi.defaults.baseURL}/conversations/unread-count`,
                status: err.response?.status,
                code: err.code
            });
        }
        
        console.groupEnd();
    }, [user])

    // ── Global Badge Sync ────────────────────────────────────
    // Expose a way for sub-pages to trigger a re-sync of counts
    // after they mark items as read.
    useEffect(() => {
        const handleSync = () => {
            console.log('[Layout] Manual sync triggered')
            syncAllCounts()
        }
        window.addEventListener('peernet:sync-counts', handleSync)
        return () => window.removeEventListener('peernet:sync-counts', handleSync)
    }, [syncAllCounts])

    // ── Toast Helpers ──────────────────────────────────────────────────────
    const showNotifToast = useCallback((notif) => {
        const typeEmoji = { like: '❤️', comment: '💬', follow: '👤', message: '💬', reply: '💬' }
        const typeText = { 
            like: notif.entityModel === 'Comment' ? 'liked your comment' : 'liked your post', 
            comment: 'commented on your post', 
            reply: 'replied to your comment',
            follow: 'started following you' 
        }
        const typeColor = { like: '#FF375F', comment: '#6366F1', follow: '#10B981', reply: '#6366F1' }
        const color = typeColor[notif.type] || '#6366F1'

        // Action destination
        const targetUrl = notif.targetUrl || '/notifications';

        toast((t) => (
            <div
                onClick={() => { navigate(targetUrl); toast.dismiss(t.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '2px 4px' }}
            >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                        src={notif.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.sender?.username || 'User'}&background=6366F1&color=fff`}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                        alt=""
                    />
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, border: '2px solid var(--surface)',
                    }}>{typeEmoji[notif.type]}</div>
                </div>

                {/* Standardized Thumbnail View */}
                {notif.thumbnail && (
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--hover)' }}>
                         <img 
                            src={notif.thumbnail} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="" 
                        />
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {notif.sender?.username || 'Someone'}
                        <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 4 }}>{typeText[notif.type] || 'notified you'}</span>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Tap to view</p>
                </div>
            </div>
        ), {
            duration: 5000,
            style: {
                background: 'var(--surface)', color: 'var(--text-1)',
                border: '1px solid var(--border-md)', borderRadius: 16,
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                padding: '12px 16px', maxWidth: 340,
            },
        })
    }, [navigate])

    const showMsgToast = useCallback((msg) => {
        const senderName = msg.sender?.username || 'Someone'
        const senderAvatar = msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`
        const convoId = msg.conversationId
        const preview = msg.body?.length > 40 ? msg.body.slice(0, 40) + '…' : (msg.body || '📷 Photo')

        toast((t) => (
            <div
                onClick={() => { navigate(`/messages/${convoId || ''}`); toast.dismiss(t.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '2px 4px' }}
            >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={senderAvatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6366F1,#A78BFA)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, border: '2px solid var(--surface)',
                    }}>💬</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{senderName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{preview}</p>
                </div>
            </div>
        ), {
            duration: 6000,
            style: {
                background: 'var(--surface)', color: 'var(--text-1)',
                border: '1px solid var(--border-md)', borderRadius: 16,
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                padding: '12px 16px', maxWidth: 340,
            },
        })
    }, [navigate])

    // ── Real-time socket events ──────────────────────────────────────────
    // 1. Static Global Listeners (Independent of navigation)
    useEffect(() => {
        if (!socket || !user) return

        const onNewNotif = (notif) => {
            unreadRef.current += 1
            setUnreadCount(unreadRef.current)
            showNotifToast(notif)
        }

        const onNotifRemoved = () => {
            console.log('🛰️ [SOCKET] Notification removed')
            unreadRef.current = Math.max(0, unreadRef.current - 1)
            setUnreadCount(unreadRef.current)
        }

        const onSyncSignal = () => {
            console.log('[Layout] Real-time sync signal received')
            syncAllCounts()
        }

        const onConnect = () => {
            console.log('🔌 [SOCKET] Connected')
            syncAllCounts()
            socket.emit('ping_online')
        }

        socket.on('new_notification', onNewNotif)
        socket.on('notification_removed', onNotifRemoved)
        socket.on('sync_counts', onSyncSignal)
        socket.on('connect', onConnect)

        // Initial check
        if (socket.connected) {
            syncAllCounts()
            socket.emit('ping_online')
        }

        return () => {
            socket.off('new_notification', onNewNotif)
            socket.off('notification_removed', onNotifRemoved)
            socket.off('sync_counts', onSyncSignal)
            socket.off('connect', onConnect)
        }
    }, [socket, user, syncAllCounts, showNotifToast])

    // 2. Contextual Message Listeners (Depends on route)
    useEffect(() => {
        if (!socket || !user) return

        const onNewMessage = (msg) => {
            const senderId = (msg.sender?._id || msg.sender || '').toString()
            if (senderId === user?._id?.toString()) return

            msgRef.current += 1
            setMsgCount(msgRef.current)
            
            const isInMessages = location.pathname.startsWith('/messages')
            const isThisConvo = location.pathname === `/messages/${msg.conversationId}`

            if (!isInMessages || !isThisConvo) {
                showMsgToast(msg)
            }
        }

        socket.on('new_message', onNewMessage)
        return () => {
            socket.off('new_message', onNewMessage)
        }
    }, [socket, user, location.pathname, showMsgToast])

    // 3. Infrastructure Heartbeat
    useEffect(() => {
        if (!socket) return
        const pingInterval = setInterval(() => {
            if (socket?.connected) socket.emit('ping_online')
        }, 25_000)
        return () => clearInterval(pingInterval)
    }, [socket])

    // ── Sidebar Highlighting Only ──
    useEffect(() => {
        // We no longer nuke badges here. 
        // Badges are now server-consistent. 
        // We only clear them if the user is on the page AND we've successfully 
        // told the server to mark them as read (handled in Notifications.jsx and Messages.jsx).
    }, [location.pathname])

    const handleNavClick = (to) => {
        if (to === '/' && location.pathname === '/') {
            mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    const [showMore, setShowMore] = useState(false)
    const moreRef = useRef(null)

    // Close "More" popup when clicking outside
    useEffect(() => {
        if (!showMore) return
        const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showMore])

    return (
        <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* ── Sidebar ── */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

                {/* Logo row */}
                <div className="sidebar-logo-row">
                    {!isCollapsed ? (
                        <Link to="/" onClick={() => handleNavClick('/')} className="sidebar-brand">
                            <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                            <span className="peernetLogo">PeerNet</span>
                        </Link>
                    ) : (
                        <Link to="/" onClick={() => handleNavClick('/')} className="sidebar-brand sidebar-brand--collapsed">
                            <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                        </Link>
                    )}
                </div>

                {/* Main nav */}
                <nav className="sidebar-nav">
                    {links.map(({ to, icon: Icon, label, exact, badge, msgBadge }) => (
                        <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
                            className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                            {({ isActive }) => (
                                <>
                                    <span className="ig-icon-wrap" style={{ position: 'relative' }}>
                                        <Icon className="ig-icon" style={{ opacity: isActive ? 1 : 0.55 }} />
                                        {badge && unreadCount > 0 && (
                                            <motion.span className="ig-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </motion.span>
                                        )}
                                        {msgBadge && msgCount > 0 && (
                                            <motion.span className="ig-badge ig-badge--msg" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                {msgCount > 9 ? '9+' : msgCount}
                                            </motion.span>
                                        )}
                                    </span>
                                    <span className="ig-label">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Create */}
                    <button className="ig-link" onClick={() => setShowCreate(true)}>
                        <span className="ig-icon-wrap">
                            <HiPlusCircle className="ig-icon" style={{ opacity: 0.55 }} />
                        </span>
                        <span className="ig-label">Create</span>
                    </button>

                    {/* Profile */}
                    <NavLink to={`/profile/${user?._id}`}
                        className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                        {({ isActive }) => (
                            <>
                                <span className="ig-icon-wrap">
                                    <img src={avatarUrl} alt=""
                                        className="ig-avatar"
                                        style={{ outline: isActive ? '2px solid var(--text-1)' : '2px solid transparent' }} />
                                </span>
                                <span className="ig-label">Profile</span>
                            </>
                        )}
                    </NavLink>
                </nav>

                {/* More button — bottom */}
                <div className="sidebar-more-wrap" style={{ marginTop: 'auto', paddingTop: 12, paddingBottom: 12 }} ref={moreRef}>
                    <AnimatePresence>
                        {showMore && (
                            <motion.div className="ig-more-popup glass-card"
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}>
                                <button className="ig-more-item" onClick={() => { document.querySelector('.theme-toggle')?.click(); setShowMore(false) }}>
                                    <ThemeToggle className="sr-only" />
                                    {isDark ? <HiSun style={{ fontSize: 20 }} /> : <HiMoon style={{ fontSize: 20 }} />}
                                    <span>Switch appearance</span>
                                </button>
                                <NavLink to="/settings" className="ig-more-item" onClick={() => setShowMore(false)}>
                                    <HiCog style={{ fontSize: 20 }} />
                                    <span>Settings</span>
                                </NavLink>
                                <div className="ig-more-divider" />
                                <button className="ig-more-item ig-more-item--danger" onClick={handleLogout}>
                                    <HiLogout style={{ fontSize: 20 }} />
                                    <span>Log out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button className={`ig-link ${showMore ? 'ig-link--active' : ''}`}
                        onClick={() => setShowMore(v => !v)}
                        style={{ width: '100%' }}>
                        <span className="ig-icon-wrap">
                            <HiMenu className="ig-icon" />
                        </span>
                        <span className="ig-label">More</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="main-col" ref={mainRef} style={{ overflowY: 'auto', height: '100dvh' }}>
                {/* ── Mobile Top Header ── */}
                <header className="mobile-top-header">
                    <Link to="/" onClick={() => handleNavClick('/')} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={logoImg} alt="PeerNet" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 8 }} />
                        <span style={{ fontFamily: "'Syne', 'Inter', sans-serif", fontWeight: 800, fontSize: 18, background: 'var(--logo-gradient)', WebkitBackgroundClip: 'text', color: 'transparent' }}>PeerNet</span>
                    </Link>
                    <div className="mobile-top-actions" ref={moreRef}>
                        <NavLink to="/notifications" className={({ isActive }) => isActive ? 'active' : ''} style={{ position: 'relative' }}>
                            <HiBell />
                            {unreadCount > 0 && (
                                <span className="mobile-badge" style={{ background: 'var(--error)' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </NavLink>
                        <NavLink to="/messages" className={({ isActive }) => isActive ? 'active' : ''} style={{ position: 'relative' }}>
                            <HiChatAlt2 />
                            {msgCount > 0 && (
                                <span className="mobile-badge" style={{ background: 'var(--accent)' }}>
                                    {msgCount > 9 ? '9+' : msgCount}
                                </span>
                            )}
                        </NavLink>
                        
                        {/* Mobile More Toggle */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowMore(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 24, display: 'flex', alignItems: 'center' }}>
                                <HiMenu />
                            </button>

                            {/* Mobile More Dropdown */}
                            <AnimatePresence>
                                {showMore && (
                                    <motion.div className="ig-more-popup"
                                        style={{ position: 'absolute', top: '100%', right: 0, marginTop: 12, bottom: 'auto', left: 'auto', width: 200 }}
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}>
                                        <button className="ig-more-item" onClick={() => { document.querySelector('.theme-toggle')?.click(); setShowMore(false) }}>
                                            <ThemeToggle className="sr-only" />
                                            {isDark ? <HiSun style={{ fontSize: 20 }} /> : <HiMoon style={{ fontSize: 20 }} />}
                                            <span>Switch appearance</span>
                                        </button>
                                        <NavLink to="/settings" className="ig-more-item" onClick={() => setShowMore(false)}>
                                            <HiCog style={{ fontSize: 20 }} />
                                            <span>Settings</span>
                                        </NavLink>
                                        <div className="ig-more-divider" />
                                        <button className="ig-more-item ig-more-item--danger" onClick={handleLogout}>
                                            <HiLogout style={{ fontSize: 20 }} />
                                            <span>Log out</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="mobile-header-spacer" />

                <div className="layout-container">
                    <AnimatePresence mode="wait">
                        <Outlet />
                    </AnimatePresence>
                </div>

                {/* ── Footer ── */}
                <footer className="site-footer">
                    <div className="site-footer__inner">
                        <span className="site-footer__brand">PeerNet</span>
                        <span className="site-footer__divider">·</span>
                        <span className="site-footer__text">Built by</span>
                        <a
                            href="https://www.linkedin.com/in/syedmukheeth"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="site-footer__link"
                        >
                            Syed Mukheeth
                        </a>
                    </div>
                </footer>
                
                <div className="mobile-nav-spacer" />
            </main>

            <nav className="mobile-nav">
                {mobileBottomLinksLeft.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
                        className={({ isActive }) => isActive ? 'active' : ''}>
                        <div style={{ position: 'relative' }}>
                            <Icon />
                        </div>
                    </NavLink>
                ))}

                {/* Centre: Create button */}
                <button onClick={() => setShowCreate(true)}
                    style={{ background: 'none', border: '1px solid var(--border-md)', borderRadius: 12, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)', fontSize: 24, fontWeight: 300, lineHeight: 1 }}>
                    <HiPlusCircle style={{ fontSize: 28 }} />
                </button>

                {mobileBottomLinksRight.map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
                        className={({ isActive }) => isActive ? 'active' : ''}>
                        <div style={{ position: 'relative' }}>
                            <Icon />
                        </div>
                    </NavLink>
                ))}

                <NavLink to={`/profile/${user?._id}`}
                    className={({ isActive }) => isActive ? 'active' : ''}>
                    <HiUser />
                </NavLink>
            </nav>

            {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
        </div>
    )
}
