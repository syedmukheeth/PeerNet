import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router'
import { Icon } from '../../components/ui/icons'
import { navGroups } from './navGroups'
import { isSuperAdmin } from '../../utils/roles'
import Logo from '../../components/ui/Logo'

const COLLAPSE_KEY = 'peernet:admin:sidebar-collapsed'

export default function AdminSidebar({ counts = {}, isOpen, user }) {
    // Collapse used to be component state, so it reset on every navigation.
    const [isCollapsed, setIsCollapsed] = useState(
        () => localStorage.getItem(COLLAPSE_KEY) === '1'
    )

    useEffect(() => {
        localStorage.setItem(COLLAPSE_KEY, isCollapsed ? '1' : '0')
    }, [isCollapsed])

    const groups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => !item.superAdminOnly || isSuperAdmin(user))
        }))
        .filter(group => group.items.length > 0)

    return (
        <aside
            className={`ac-sidebar ${isOpen ? 'is-open' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
        >
            <div className="ac-sidebar-head">
                <Link to="/" className="ac-brand" title="Back to PeerNet">
                    <Logo size={26} />
                    <span className="ac-brand-text">
                        <span className="ac-brand-name">PeerNet</span>
                        <span className="ac-brand-sub">Admin</span>
                    </span>
                </Link>

                {/* Must never carry ac-collapse-hide: that class is what the
                    collapsed sidebar hides, so the one control that expands the
                    rail again disappeared the moment you collapsed it. */}
                <button
                    type="button"
                    onClick={() => setIsCollapsed(prev => !prev)}
                    className="btn btn-ghost btn-icon-sm ac-collapse-toggle"
                    aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                >
                    <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
                </button>
            </div>

            <nav className="ac-sidebar-nav ac-scroll">
                {groups.map(group => (
                    <div key={group.title} className="ac-sidebar-group">
                        <div className="ac-sidebar-label">{group.title}</div>
                        {group.items.map(item => {
                            const count = item.countKey ? counts[item.countKey] : 0
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `ac-nav-item ${isActive ? 'active' : ''}`
                                    }
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <item.icon size={18} />
                                    <span className="ac-nav-label">{item.label}</span>
                                    {count > 0 && <span className="ac-nav-count">{count}</span>}
                                </NavLink>
                            )
                        })}
                    </div>
                ))}
            </nav>

            <div className="ac-sidebar-foot">
                <Link to="/" className="btn btn-secondary btn-block">
                    <Icon name="exit" size={18} />
                    <span className="ac-collapse-hide">Back to PeerNet</span>
                </Link>
            </div>
        </aside>
    )
}
