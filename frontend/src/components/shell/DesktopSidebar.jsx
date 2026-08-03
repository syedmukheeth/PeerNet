import { NavLink, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
    HiLogout, HiLogin, HiCog, HiMenu, HiMoon, HiSun,
    HiShieldCheck, HiSwitchHorizontal,
} from 'react-icons/hi'
import { HiOutlinePlusCircle, HiOutlineShieldCheck } from 'react-icons/hi'
import { navLinks } from './navLinks'
import logoImg from '../../assets/logo.png'

/*
 * The desktop rail: branding, primary nav, create/admin entries, and the
 * profile card with its "More" popup (theme, settings, switch account, log
 * out). Not rendered on /admin - Layout keeps that condition, since it also
 * governs the mobile chrome.
 */
export default function DesktopSidebar({
    user,
    unreadCount,
    msgCount,
    avatarUrl,
    isDark,
    toggle,
    showMore,
    setShowMore,
    moreRef,
    onCreatePost,
    onSwitchAccounts,
    onLogout,
}) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return (
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
                {navLinks.map(({ to, icon: Icon, activeIcon: ActiveIcon, label, exact, badge, msgBadge }) => (
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
                    <button className="ig-link" onClick={onCreatePost} type="button">
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
                                    <button className="ig-more-item" onClick={() => { setShowMore(false); onSwitchAccounts() }}>
                                        <HiSwitchHorizontal size={20} /> <span>Switch account</span>
                                    </button>
                                )}
                                <div className="ig-more-divider" />
                                {user ? (
                                    <button className="ig-more-item text-error" onClick={onLogout}>
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
    )
}
