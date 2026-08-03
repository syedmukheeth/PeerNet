import {
    HiUsers, HiCollection, HiGlobe, HiChatAlt2, HiFlag,
    HiTrendingUp, HiShieldCheck, HiDatabase,
} from 'react-icons/hi'

export const navGroups = [
    {
        title: 'Insights',
        items: [
            { id: 'dashboard', label: 'Summary', icon: HiGlobe },
            { id: 'analytics', label: 'Performance', icon: HiTrendingUp }
        ]
    },
    {
        title: 'Moderation',
        items: [
            { id: 'users', label: 'Users', icon: HiUsers },
            { id: 'posts', label: 'All Content', icon: HiCollection },
            { id: 'comments', label: 'Comments', icon: HiChatAlt2 },
            { id: 'reports', label: 'Reports', icon: HiFlag }
        ]
    },
    {
        title: 'Settings',
        items: [
            { id: 'infrastructure', label: 'Server Health', icon: HiDatabase },
            { id: 'audit', label: 'Activity Logs', icon: HiShieldCheck }
        ]
    }
]

export default navGroups
