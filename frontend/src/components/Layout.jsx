import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import React, { useState, useEffect, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiUser, HiLogout, HiPlusCircle, HiBadgeCheck, HiCog, HiMenu, HiMoon, HiSun
} from 'react-icons/hi'
import { FaLinkedin } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'
import api, { SOCKET_URL } from '../api/axios'
import CreatePostModal from './CreatePostModal'
import ThemeToggle from './ThemeToggle'
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

let layoutSocket = null

export default function Layout() {
    const { user, logout } = useAuth()
    const { isDark } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const [showCreate, setShowCreate] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [msgCount, setMsgCount] = useState(0)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const unreadRef = useRef(0)
    const msgRef = useRef(0)
    const mainRef = useRef(null)

    // ── Scroll to top on route change ──────────────────────
    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }, [location.pathname])

    // ── Fetch initial unread notification count ─────────────
    useEffect(() => {
        if (!user) return
        api.get('/notifications?limit=1')
            .then(({ data }) => {
                const c = data.unreadCount || 0
                unreadRef.current = c
                setUnreadCount(c)
            })
            .catch(() => { })
    }, [user])

    // Messages badge starts at 0 — only bumped by real-time socket events
    // (Instagram-style: badge only appears for messages received in this session)

    // ── Real-time notifications via socket ─────────────────
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        layoutSocket = io(SOCKET_URL, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        })

        layoutSocket.on('new_notification', (notif) => {
            unreadRef.current += 1
            setUnreadCount(unreadRef.current)

            const typeEmoji = { like: '❤️', comment: '💬', follow: '👤' }
            const typeText = { like: 'liked your post', comment: 'commented on your post', follow: 'started following you' }

            toast(
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                        src={notif.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.sender?.username}&background=6366F1&color=fff`}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        alt=""
                    />
                    <div>
                        <strong style={{ fontSize: 13 }}>{notif.sender?.username}</strong>
                        <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 5 }}>{typeText[notif.type]}</span>
                    </div>
                    <span style={{ fontSize: 18, marginLeft: 'auto' }}>{typeEmoji[notif.type]}</span>
                </div>,
                { duration: 3500 }
            )
        })

        layoutSocket.on('new_message', (msg) => {
            // Only bump if message is FROM someone else (not our own send)
            const senderId = msg.sender?._id || msg.sender
            const isFromMe = senderId === user?._id
            if (isFromMe) return

            // Only bump badge if NOT currently on messages page
            if (!window.location.pathname.startsWith('/messages')) {
                msgRef.current += 1
                setMsgCount(c => c + 1)
                // Show a toast like Instagram
                const senderName = msg.sender?.username || 'Someone'
                const senderAvatar = msg.sender?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`
                toast(
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={senderAvatar}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            alt="" />
                        <div>
                            <strong style={{ fontSize: 13 }}>{senderName}</strong>
                            <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 5 }}>sent you a message</span>
                        </div>
                        <span style={{ fontSize: 16, marginLeft: 'auto' }}>💬</span>
                    </div>,
                    { duration: 3500 }
                )
            }
        })

        return () => { layoutSocket?.disconnect(); layoutSocket = null }
    }, [user])

    // ── Clear badges when actually ON the relevant page ────
    useEffect(() => {
        if (location.pathname === '/notifications') {
            setUnreadCount(0)
            unreadRef.current = 0
            api.patch('/notifications/read').catch(() => { })
        }
        if (location.pathname.startsWith('/messages')) {
            setMsgCount(0)
            msgRef.current = 0
        }
    }, [location.pathname])

    const handleNavClick = () => { } // retained for any future use

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    return (
        <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* ── Sidebar ── */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px', marginBottom: 16, gap: 12, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <motion.button onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-1)',
                            cursor: 'pointer', padding: 8, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}
                        whileHover={{ background: 'var(--hover)' }}>
                        <HiMenu style={{ fontSize: 24 }} />
                    </motion.button>

                    {!isCollapsed && (
                        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0, overflow: 'visible' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                                <img src={logoImg} alt="PeerNet" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
                                <span className="peernetLogo" style={{ fontSize: 22 }}>PeerNet&nbsp;</span>
                            </div>
                        </Link>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8 }}>
                    {links.map(({ to, icon: Icon, label, exact, badge, msgBadge }, index) => (
                        <Fragment key={to}>
                            {index === 3 && (
                                <Fragment key="group2-divider">
                                    <div style={{ height: 1, background: 'var(--border)', margin: '12px 10px' }} />
                                    <NavLink to={`/profile/${user?._id}`}
                                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                        style={{ position: 'relative' }}>
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="sidebar-active"
                                                        style={{ position: 'absolute', inset: 0, background: 'var(--accent-subtle)', borderRadius: 9 }}
                                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                                    />
                                                )}
                                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', color: isActive ? 'var(--accent)' : 'inherit' }}>
                                                    <img src={avatarUrl} className="avatar avatar-xs" alt="" style={{ border: isActive ? '2px solid var(--accent)' : 'none', width: 24, height: 24, margin: isCollapsed ? '0 auto' : 0 }} />
                                                </div>
                                                <span className="link-label" style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>You</span>
                                            </>
                                        )}
                                    </NavLink>
                                </Fragment>
                            )}
                            <NavLink to={to} end={exact} onClick={() => handleNavClick(to)}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                style={{ position: 'relative' }}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="sidebar-active"
                                                style={{ position: 'absolute', inset: 0, background: 'var(--accent-subtle)', borderRadius: 9 }}
                                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                            />
                                        )}
                                        <div style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>
                                            <Icon style={{ fontSize: 24, opacity: isActive ? 1 : 0.7 }} />
                                            {badge && unreadCount > 0 && (
                                                <motion.span
                                                    style={{
                                                        position: 'absolute', top: -6, right: -8,
                                                        background: 'var(--error)', color: '#fff',
                                                        borderRadius: 99, fontSize: 9, fontWeight: 700,
                                                        minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                                                        border: '2px solid var(--surface)',
                                                    }}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </motion.span>
                                            )}
                                            {msgBadge && msgCount > 0 && (
                                                <motion.span
                                                    style={{
                                                        position: 'absolute', top: -6, right: -8,
                                                        background: 'var(--accent)', color: '#fff',
                                                        borderRadius: 99, fontSize: 9, fontWeight: 700,
                                                        minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                                                        border: '2px solid var(--surface)',
                                                    }}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                                    {msgCount > 9 ? '9+' : msgCount}
                                                </motion.span>
                                            )}
                                        </div>
                                        <span className="link-label" style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>{label}</span>
                                    </>
                                )}
                            </NavLink>
                        </Fragment>
                    ))}

                    <motion.button className="sidebar-link" onClick={() => setShowCreate(true)}
                        style={{ width: '100%' }}
                        whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
                        <HiPlusCircle style={{ fontSize: 24, opacity: 0.7 }} />
                        <span className="link-label">Create</span>
                    </motion.button>
                </div>

                <div style={{ flexShrink: 0, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="sidebar-link" onClick={() => document.querySelector('.theme-toggle').click()}
                        style={{ width: '100%', color: 'var(--text-3)' }}
                        whileHover={{ color: 'var(--text-1)' }}>
                        <ThemeToggle className="sr-only" />
                        {isDark ? <HiSun style={{ fontSize: 24 }} /> : <HiMoon style={{ fontSize: 24 }} />}
                        <span className="link-label">Appearance</span>
                    </button>

                    <NavLink to="/settings"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        style={{ position: 'relative' }}>
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        style={{ position: 'absolute', inset: 0, background: 'var(--accent-subtle)', borderRadius: 9 }}
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <div style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>
                                    <HiCog style={{ fontSize: 24, opacity: isActive ? 1 : 0.7 }} />
                                </div>
                                <span className="link-label" style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>Settings</span>
                            </>
                        )}
                    </NavLink>

                    <motion.button className="sidebar-link" onClick={handleLogout}
                        style={{ width: '100%', color: 'var(--text-3)' }}
                        whileHover={{ color: 'var(--error)' }}>
                        <HiLogout style={{ fontSize: 24 }} />
                        <span className="link-label">Sign out</span>
                    </motion.button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="main-col" ref={mainRef} style={{ overflowY: 'auto', height: '100dvh' }}>
                {/* ── Mobile Top Header ── */}
                <header className="mobile-top-header">
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={logoImg} alt="PeerNet" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 8 }} />
                        <span style={{ fontFamily: "'Syne', 'Inter', sans-serif", fontWeight: 800, fontSize: 18, background: 'var(--logo-gradient)', WebkitBackgroundClip: 'text', color: 'transparent' }}>PeerNet</span>
                    </Link>
                    <div className="mobile-top-actions">
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
                    </div>
                </header>

                <div className="content-wrap">
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
                            href="https://www.linkedin.com/in/syedmukheeth/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="site-footer__link"
                        >
                            <FaLinkedin className="site-footer__li-icon" />
                            Syed Mukheeth
                        </a>
                    </div>
                </footer>
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
