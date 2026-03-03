import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import {
    HiHome, HiSearch, HiFilm, HiChatAlt2,
    HiBell, HiUser, HiLogout, HiPlusCircle, HiBadgeCheck, HiChevronDown, HiChevronUp
} from 'react-icons/hi'
import api from '../api/axios'
import CreatePostModal from './CreatePostModal'
import ThemeToggle from './ThemeToggle'

const links = [
    { to: '/', icon: HiHome, label: 'Home', exact: true },
    { to: '/search', icon: HiSearch, label: 'Search' },
    { to: '/reels', icon: HiFilm, label: 'Dscrolls' },
    { to: '/messages', icon: HiChatAlt2, label: 'Messages' },
    { to: '/notifications', icon: HiBell, label: 'Notifications', badge: true },
]

let layoutSocket = null

export default function Layout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [showCreate, setShowCreate] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [following, setFollowing] = useState([])
    const [showAllFollowing, setShowAllFollowing] = useState(false)
    const unreadRef = useRef(0)

    // Fetch following for sidebar
    useEffect(() => {
        if (!user) return
        api.get(`/users/${user._id}/following?limit=50`)
            .then(({ data }) => setFollowing(data.data || []))
            .catch(() => { })
    }, [user])

    // ── Real-time notifications via socket ─────────────────
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        layoutSocket = io(window.location.origin, {
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

        return () => { layoutSocket?.disconnect(); layoutSocket = null }
    }, [user])

    // ── Reset unread count when visiting /notifications ────
    const handleNavClick = (to) => {
        if (to === '/notifications') {
            setUnreadCount(0)
            unreadRef.current = 0
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    return (
        <div className="app-layout">
            {/* ── Sidebar ── */}
            <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <div className="peernetLogo">
                        PeerNet
                    </div>
                </Link>

                {/* Scrollable top section */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 10px 8px' }}>
                        Navigation
                    </div>

                    {links.map(({ to, icon: Icon, label, exact, badge }) => (
                        <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
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
                                        <Icon style={{ fontSize: 20, opacity: isActive ? 1 : 0.7 }} />
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
                                    </div>
                                    <span style={{ position: 'relative', zIndex: 1, color: isActive ? 'var(--accent)' : 'inherit' }}>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}

                    <motion.button className="sidebar-link" onClick={() => setShowCreate(true)}
                        style={{ width: '100%', marginTop: 4, marginBottom: 8 }}
                        whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
                        <HiPlusCircle style={{ fontSize: 20, opacity: 0.7 }} />
                        <span>Create</span>
                    </motion.button>

                    {/* Following Section */}
                    {user && following.length > 0 && (
                        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', padding: '0 10px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                Following
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {(showAllFollowing ? following : following.slice(0, 7)).map(fUser => (
                                    <NavLink key={fUser._id} to={`/profile/${fUser._id}`}
                                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                        style={{ position: 'relative', padding: '6px 10px' }}>
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="sidebar-active"
                                                        style={{ position: 'absolute', inset: 0, background: 'var(--accent-subtle)', borderRadius: 9 }}
                                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                                    />
                                                )}
                                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, width: '100%', color: isActive ? 'var(--accent)' : 'inherit' }}>
                                                    <img src={fUser.avatarUrl || `https://ui-avatars.com/api/?name=${fUser.username}&background=FF375F&color=fff`} className="avatar avatar-xs" alt="" style={{ border: isActive ? '2px solid var(--accent)' : 'none', width: 24, height: 24 }} />
                                                    <span className="truncate" style={{ flex: 1, maxWidth: 110, fontSize: 13, fontWeight: isActive ? 600 : 500 }}>{fUser.username}</span>
                                                    {fUser.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }} />}
                                                </div>
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                                {following.length > 7 && (
                                    <button className="sidebar-link" onClick={() => setShowAllFollowing(!showAllFollowing)}
                                        style={{ padding: '8px 10px', marginTop: 4 }}>
                                        {showAllFollowing ? <HiChevronUp style={{ fontSize: 20, opacity: 0.7 }} /> : <HiChevronDown style={{ fontSize: 20, opacity: 0.7 }} />}
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>Show {showAllFollowing ? 'fewer' : 'more'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom — pinned, never pushed off-screen */}
                <div style={{ flexShrink: 0, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ padding: '4px 10px 8px' }}>
                        <ThemeToggle />
                    </div>

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
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, width: '100%', color: isActive ? 'var(--accent)' : 'inherit' }}>
                                    <img src={avatarUrl} className="avatar avatar-xs" alt="" style={{ border: isActive ? '2px solid var(--accent)' : 'none' }} />
                                    <span className="truncate" style={{ flex: 1, maxWidth: 110 }}>{user?.username}</span>
                                    {user?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }} />}
                                </div>
                            </>
                        )}
                    </NavLink>

                    <motion.button className="sidebar-link" onClick={handleLogout}
                        style={{ width: '100%', color: 'var(--text-3)' }}
                        whileHover={{ color: 'var(--error)' }}>
                        <HiLogout style={{ fontSize: 20 }} />
                        <span>Sign out</span>
                    </motion.button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="main-col">
                <div className="content-wrap">
                    <AnimatePresence mode="wait">
                        <Outlet />
                    </AnimatePresence>
                </div>
            </main>

            <nav className="mobile-nav">
                {links.slice(0, 2).map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
                        className={({ isActive }) => isActive ? 'active' : ''}>
                        <div style={{ position: 'relative' }}>
                            <Icon />
                            {to === '/notifications' && unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--error)', color: '#fff', borderRadius: 99, fontSize: 9, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', fontWeight: 700 }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </NavLink>
                ))}

                {/* Centre: Create button */}
                <button onClick={() => setShowCreate(true)}
                    style={{ background: 'var(--accent)', border: 'none', borderRadius: 12, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-accent)', color: '#fff', fontSize: 22, fontWeight: 300, lineHeight: 1 }}>
                    +
                </button>

                {links.slice(2).map(({ to, icon: Icon, exact }) => (
                    <NavLink key={to} to={to} end={exact} onClick={() => handleNavClick(to)}
                        className={({ isActive }) => isActive ? 'active' : ''}>
                        <div style={{ position: 'relative' }}>
                            <Icon />
                            {to === '/notifications' && unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--error)', color: '#fff', borderRadius: 99, fontSize: 9, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', fontWeight: 700 }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
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
