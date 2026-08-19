import { HiUsers, HiCollection, HiGlobe, HiChatAlt2, HiFlag, HiShieldCheck, HiDatabase, HiCog } from '../../components/ui/icons'

/*
 * Each screen owns a URL. These were tab ids driving a `activeTab` string, so
 * the whole console lived at /admin: a refresh dropped you back on Summary,
 * the back button left the console entirely, and there was no way to send
 * someone a link to the report queue.
 *
 * `to` is relative to the /admin route. `end` marks the index route so its
 * NavLink does not stay active on every child path.
 */
export const navGroups = [
    {
        title: 'Insights',
        items: [
            { to: '.', end: true, label: 'Summary', icon: HiGlobe }
        ]
    },
    {
        title: 'Moderation',
        items: [
            { to: 'users', label: 'Users', icon: HiUsers },
            { to: 'content', label: 'Content', icon: HiCollection },
            { to: 'comments', label: 'Comments', icon: HiChatAlt2 },
            { to: 'reports', label: 'Reports', icon: HiFlag, countKey: 'reports' }
        ]
    },
    {
        title: 'System',
        items: [
            { to: 'health', label: 'Server health', icon: HiDatabase },
            { to: 'activity', label: 'Activity log', icon: HiShieldCheck },
            { to: 'settings', label: 'Settings', icon: HiCog, superAdminOnly: true }
        ]
    }
]

export default navGroups
