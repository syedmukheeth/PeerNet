import { Link, NavLink } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineBell, HiOutlineChatAlt2, HiMenu, HiMoon, HiSun, HiCog, HiShieldCheck, HiSwitchHorizontal, HiLogout, HiLogin } from '../ui/icons'
import logoImg from '../../assets/logo.png'
import { isAdmin } from '../../utils/roles'

/*
 * The mobile top bar plus its slide-down "more" popup. Mirrors the desktop
 * sidebar's More menu, since both must offer the same actions.
 */
export default function MobileHeader({
    user,
    unreadCount,
    msgCount,
    isDark,
    toggle,
    showMore,
    setShowMore,
    mobileMenuBtnRef,
    mobilePopupRef,
    onSwitchAccounts,
    onLogout,
}) {
    return (
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
                        {isAdmin(user) && (
                            <NavLink to="/admin" className="mobile-more-item" onClick={() => setShowMore(false)}>
                                <HiShieldCheck size={20} /> <span>Admin Console</span>
                            </NavLink>
                        )}
                        {user && (
                            <button className="mobile-more-item" onClick={() => { setShowMore(false); onSwitchAccounts() }}>
                                <HiSwitchHorizontal size={20} /> <span>Switch account</span>
                            </button>
                        )}
                        <div className="mobile-more-divider" />
                        {user ? (
                            <button className="mobile-more-item text-error" onClick={onLogout}>
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
    )
}
