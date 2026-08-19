import { useState, useEffect, useCallback, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../../components/ui/icons'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import * as adminApi from './admin.api'
import { navGroups } from './navGroups'
import AdminSidebar from './AdminSidebar'
import './admin.css'

/*
 * Layout shell for the console. It owns three things and nothing else: the
 * sidebar, the page header, and the two pieces of state that genuinely span
 * every screen (the live infrastructure pulse and the pending report count
 * the sidebar badges). Everything else belongs to the screen that shows it.
 */
export default function AdminPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [pulse, setPulse] = useState(null)
    const [reports, setReports] = useState([])

    const { user } = useAuth()
    const socket = useSocket(user)
    const location = useLocation()

    const activeTitle = resolveTitle(location.pathname)

    // The backend emits infrastructure_pulse to the admin:infrastructure room
    // every 5s. This is the only genuinely live data in the console.
    useEffect(() => {
        if (!socket) return
        socket.on('infrastructure_pulse', setPulse)
        return () => socket.off('infrastructure_pulse')
    }, [socket])

    const loadReports = useCallback(async () => {
        try {
            const { data } = await adminApi.getPendingReports()
            if (data.success) setReports(data.reports || [])
        } catch {
            // The badge is not worth a toast on every screen change.
        }
    }, [])

    useEffect(() => {
        loadReports()
    }, [loadReports])

    // Close the drawer on navigation, otherwise it stays over the screen you
    // just picked.
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [location.pathname])

    return (
        <div className="ac-shell">
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="ac-backdrop"
                    />
                )}
            </AnimatePresence>

            <AdminSidebar
                counts={{ reports: reports.length }}
                isOpen={isSidebarOpen}
                user={user}
            />

            <main className="ac-main ac-scroll">
                <header className="ac-header">
                    <div className="ac-header-actions">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className="btn btn-ghost btn-icon ac-mobile-only"
                            aria-label="Open navigation"
                        >
                            <Icon name="menu" size={20} />
                        </button>
                        <h1 className="ac-title">{activeTitle}</h1>
                    </div>

                    <div className="ac-header-actions">
                        <div className="ac-identity">
                            <div className="ac-desktop-only">
                                <div className="ac-identity-name">@{user?.username}</div>
                                <div className="ac-identity-role">Administrator</div>
                            </div>
                            <div className="ac-avatar">
                                {user?.username?.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Each screen is its own lazy chunk. Without a boundary here
                    they suspend up to the app-level one, which unmounts the
                    shell and flashes a full-page spinner on every tab click. */}
                <div className="ac-content">
                    <Suspense fallback={<ScreenFallback />}>
                        <Outlet context={{ pulse, reports, reloadReports: loadReports }} />
                    </Suspense>
                </div>
            </main>
        </div>
    )
}

/*
 * The header title comes from the same nav definition the sidebar renders, so
 * the two can never disagree. This resolves from the path rather than from
 * `useMatches`, which needs a data router; this app routes declaratively.
 */
function resolveTitle(pathname) {
    const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0]
    const item = navGroups
        .flatMap(g => g.items)
        .find(i => (segment ? i.to === segment : i.end))
    return item?.label || 'Admin'
}

function ScreenFallback() {
    return (
        <div className="ac-stack">
            <div className="skeleton" style={{ height: 96, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 320, borderRadius: 14, opacity: 0.6 }} />
        </div>
    )
}
