import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import React, { useState, useEffect, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiLogout, HiPlusCircle, HiCog, HiMenu, HiMoon, HiSun,
    HiOutlineHome, HiOutlineSearch, HiOutlineFilm, HiOutlineChatAlt2,
    HiOutlineBell, HiOutlinePlusCircle, HiDotsCircleHorizontal
} from 'react-icons/hi'
import { FaLinkedin } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'
import api, { SOCKET_URL } from '../api/axios'
import CreatePostModal from './CreatePostModal'
import ThemeToggle from './ThemeToggle'
import logoImg from '../assets/logo.png'

// Instagram-style nav: icon (outline inactive, filled active) + label
const links = [
    { to: '/', iconActive: HiHome, iconInactive: HiOutlineHome, label: 'Home', exact: true },
    { to: '/search', iconActive: HiSearch, iconInactive: HiOutlineSearch, label: 'Search' },
    { to: '/dscrolls', iconActive: HiFilm, iconInactive: HiOutlineFilm, label: 'Dscrolls' },
    { to: '/messages', iconActive: HiChatAlt2, iconInactive: HiOutlineChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', iconActive: HiBell, iconInactive: HiOutlineBell, label: 'Notifications', badge: true },
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
                        <Link to="/" className="sidebar-brand">
                            <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                            <span className="peernetLogo">PeerNet</span>
                        </Link>
                    ) : (
                        <Link to="/" className="sidebar-brand sidebar-brand--collapsed">
                            <img src={logoImg} alt="PeerNet" className="sidebar-brand-img" />
                        </Link>
                    )}
                </div>

                {/* Main nav */}
                <nav className="sidebar-nav">
                    {links.map(({ to, iconActive: IconActive, iconInactive: IconInactive, label, exact, badge, msgBadge }) => (
                        <NavLink key={to} to={to} end={exact}
                            className={({ isActive }) => `ig-link ${isActive ? 'ig-link--active' : ''}`}>
                            {({ isActive }) => {
                                const Icon = isActive ? IconActive : IconInactive
                                return (
                                    <>
                                        <span className="ig-icon-wrap" style={{ position: 'relative' }}>
                                            <Icon className="ig-icon" />
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
                                )
                            }}
                        </NavLink>
                    ))}

                    {/* Create */}
                    <button className="ig-link" onClick={() => setShowCreate(true)}>
                        <span className="ig-icon-wrap">
                            <HiOutlinePlusCircle className="ig-icon ig-icon--create" />
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
                <div className="sidebar-more-wrap" ref={moreRef}>
                    <AnimatePresence>
                        {showMore && (
                            <motion.div className="ig-more-popup"
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
