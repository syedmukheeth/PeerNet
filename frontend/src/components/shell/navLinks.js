import {
    HiHome, HiSearch, HiChatAlt2, HiBell,
} from 'react-icons/hi'
import {
    HiOutlineHome, HiOutlineSearch, HiOutlineChatAlt2, HiOutlineBell,
} from 'react-icons/hi'

export const navLinks = [
    { to: '/', icon: HiOutlineHome, activeIcon: HiHome, label: 'Home', exact: true },
    { to: '/search', icon: HiOutlineSearch, activeIcon: HiSearch, label: 'Search' },
    { to: '/messages', icon: HiOutlineChatAlt2, activeIcon: HiChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', icon: HiOutlineBell, activeIcon: HiBell, label: 'Notifications', badge: true },
]

export default navLinks
