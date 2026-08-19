import { NavLink } from 'react-router'
import { useLocation } from 'react-router'
import { HiHome, HiSearch, HiPlus, HiLogin, HiOutlineHome, HiOutlineSearch } from '../ui/icons'
/*
 * Bottom tab bar, mobile only. Layout hides this entirely while inside a
 * specific message thread (kept as Layout's own visibility check, since it
 * also decides the site footer and admin main-column class together).
 */
export default function MobileNav({ user, avatarUrl, onCreatePost }) {
    const location = useLocation()

    return (
        <nav className="mobile-nav">
            <NavLink to="/" end className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                {({ isActive }) => isActive ? <HiHome size={28} /> : <HiOutlineHome size={28} />}
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                {({ isActive }) => isActive ? <HiSearch size={28} /> : <HiOutlineSearch size={28} />}
            </NavLink>
            {user && (
                <button className="mobile-nav-item" onClick={onCreatePost} aria-label="Create post">
                    <HiPlus size={30} className="border-2 border-primary rounded-lg p-0.5" />
                </button>
            )}
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
    )
}
