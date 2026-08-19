import { HiHome, HiSearch, HiChatAlt2, HiBell, HiOutlineHome, HiOutlineSearch, HiOutlineChatAlt2, HiOutlineBell } from '../ui/icons'
export const navLinks = [
    { to: '/', icon: HiOutlineHome, activeIcon: HiHome, label: 'Home', exact: true },
    { to: '/search', icon: HiOutlineSearch, activeIcon: HiSearch, label: 'Search' },
    { to: '/messages', icon: HiOutlineChatAlt2, activeIcon: HiChatAlt2, label: 'Messages', msgBadge: true },
    { to: '/notifications', icon: HiOutlineBell, activeIcon: HiBell, label: 'Notifications', badge: true },
]

export default navLinks
