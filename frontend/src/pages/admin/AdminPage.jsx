import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { HiUsers, HiCollection, HiFlag, HiTrendingUp, HiRefresh, HiMenu } from '../../components/ui/icons'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import * as adminApi from './admin.api'
import { navGroups } from './navGroups'
import AdminSidebar from './AdminSidebar'
import StatCard from './StatCard'
import AnalyticsModule from './modules/AnalyticsModule'
import InfrastructureModule from './modules/InfrastructureModule'
import UserModule from './modules/UserModule'
import CommentModule from './modules/CommentModule'
import AuditModule from './modules/AuditModule'
import PostModule from './modules/PostModule'
import ReportModule from './modules/ReportModule'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import SystemActionModal from './SystemActionModal'
import './admin.css'

export default function AdminPage() {

    const [activeTab, setActiveTab] = useState('dashboard')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [stats, setStats] = useState(null)
    const [analytics, setAnalytics] = useState(null)
    const [pulse, setPulse] = useState({ load: 0.12, latency: 42, activeUsers: 0 })
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [comments, setComments] = useState([])
    const [reports, setReports] = useState([])
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [contentType, setContentType] = useState('all')

    const { user } = useAuth()
    const socket = useSocket(user)

    useEffect(() => {
        if (socket) {
            socket.on('infrastructure_pulse', (data) => {
                setPulse(data)
                // Optionally update stats with latest user count etc.
                setStats(prev => prev ? { ...prev, ...data } : data)
            })
            return () => socket.off('infrastructure_pulse')
        }
    }, [socket])

    const [showSystemModal, setShowSystemModal] = useState(false)
    const [systemActionType, setSystemActionType] = useState('')
    const [systemConfirmCode, setSystemConfirmCode] = useState('')
    const [systemAdminPassword, setSystemAdminPassword] = useState('')
    const [isExecutingSystem, setIsExecutingSystem] = useState(false)

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [targetUserId, setTargetUserId] = useState(null)

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await adminApi.getStats()
            if (data.success) setStats(data.data)
        } catch {
            toast.error('Failed to load system metrics')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await adminApi.getUsers(q)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('Failed to connect to user database')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await adminApi.getPosts(type)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to load moderation feed')
        }
    }, [])

    const fetchComments = useCallback(async (q = '') => {
        try {
            const { data } = await adminApi.getComments(q)
            if (data.success) setComments(data.comments)
        } catch {
            toast.error('Failed to load comment database')
        }
    }, [])


    const fetchReports = useCallback(async () => {
        try {
            const { data } = await adminApi.getPendingReports()
            if (data.success) setReports(data.reports || [])
        } catch {
            toast.error('Failed to load pending reports')
        }
    }, [])

    const fetchLogs = useCallback(async () => {
        try {
            const { data } = await adminApi.getLogs()
            if (data.success) setLogs(data.logs || [])
        } catch {
            toast.error('Audit trail disconnected')
        }
    }, [])

    const handleResolveReport = async (reportId, status, resolution = '') => {
        try {
            await adminApi.resolveReport(reportId, status, resolution)
            toast.success(`Report ${status}`)
            fetchReports()
        } catch {
            toast.error('Action failed')
        }
    }


    const fetchAnalytics = useCallback(async () => {
        try {
            const { data } = await adminApi.getAnalytics()
            if (data.success) setAnalytics(data.data)
        } catch {
            console.error('Failed to load advanced analytics')
        }
    }, [])

    /**
     * Data Initialization & Polling
     * Orchestrates the retrieval of system-wide metrics, user databases,
     * and security logs from the central infrastructure.
     */
    // contentType is deliberately not a dependency. It used to be, and the mount
    // effect below is keyed on init, so changing the post-type filter re-ran all
    // seven fetches and flipped the global loading flag, blanking the entire
    // console to reload one list.
    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(),
            fetchAnalytics(),
            fetchUsers(),
            fetchComments(),
            fetchReports(),
            fetchLogs()
        ])
        setLoading(false)
    }, [fetchStats, fetchAnalytics, fetchUsers, fetchComments, fetchReports, fetchLogs])

    useEffect(() => {
        init()
    }, [init])

    // The post list owns its own filter, so it refetches on its own.
    useEffect(() => {
        fetchPosts(contentType)
    }, [fetchPosts, contentType])

    const handleDeleteUser = async () => {
        if (!targetUserId) return
        try {
            await adminApi.deleteUser(targetUserId)
            toast.success('User account deleted successfully')
            setShowDeleteModal(false)
            setTargetUserId(null)
            init()
        } catch {
            toast.error('Deletion operation failed')
            setShowDeleteModal(false)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            await adminApi.deletePost(postId)
            toast.success('Post removed from platform')
            fetchPosts(contentType)
            fetchReports()
            fetchStats()
            fetchUsers()
        } catch {
            toast.error('Removal failed')
        }
    }

    const handleDeleteComment = async (commentId) => {
        try {
            await adminApi.deleteComment(commentId)
            toast.success('Comment purged')
            fetchComments(search)
            fetchReports()
            fetchStats()
        } catch {
            toast.error('Purge operation failed')
        }
    }

    const handleToggleVerify = async (userId, currentlyVerified) => {
        try {
            await adminApi.toggleVerifyUser(userId)
            toast.success(currentlyVerified ? 'User unverified' : 'User verified')
            fetchUsers(search)
            fetchStats()
        } catch {
            toast.error('Verification update failed')
        }
    }

    const handleSystemAction = async () => {
        if (systemConfirmCode !== 'DELETE') {
            return toast.error('Please type DELETE to confirm')
        }
        if (!systemAdminPassword) {
            return toast.error('Admin password is required')
        }

        try {
            setIsExecutingSystem(true)
            const { data } = await adminApi.runSystemAction(systemActionType, systemConfirmCode, systemAdminPassword)
            if (data.success) {
                toast.success('Operation executed successfully')
                setShowSystemModal(false)
                setSystemConfirmCode('')
                setSystemAdminPassword('')
                init()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authentication failed')
        } finally {
            setIsExecutingSystem(false)
        }
    }

    /**
     * Module Orchestrator
     * Dynamically renders the appropriate administrative interface based
     * on the active navigation context.
     *
     * @returns {React.Component} The active module interface
     */
    const renderModule = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard
                                label="Global Identities"
                                value={(stats?.totalUsers || 0).toLocaleString()}
                                sub="Verified Users"
                                icon={<HiUsers />}
                                chartData={stats?.charts?.userGrowth?.map(d => d.count)}
                                loading={loading}
                            />
                            <StatCard
                                label="Feed Velocity"
                                value={(stats?.totalPosts || 0).toLocaleString()}
                                sub="Broadcast Objects"
                                icon={<HiCollection />}
                                chartData={[4, 8, 5, 9, 12, 10, 15, 8, 14, 18]}
                                loading={loading}
                            />
                            <StatCard
                                label="Security Queue"
                                value={reports.length.toString()}
                                sub="Pending Violations"
                                icon={<HiFlag />}
                                accent={reports.length > 0}
                                loading={loading}
                            />
                            <StatCard
                                label="System Health"
                                value="99.9%"
                                sub="Uptime Velocity"
                                icon={<HiTrendingUp />}
                                loading={loading}
                            />
                        </div>
                        <AnalyticsModule stats={stats} analytics={analytics} />
                    </div>
                )
            case 'analytics':
                return <AnalyticsModule stats={stats} analytics={analytics} />
            case 'users':
                return (
                    <UserModule
                        users={users}
                        search={search}
                        setSearch={setSearch}
                        onVerify={(id) => { const u = users.find(x => x._id === id); handleToggleVerify(id, u?.isVerified); }}
                        onDelete={(id) => { setTargetUserId(id); setShowDeleteModal(true); }}
                        loading={loading}
                    />
                )
            case 'posts':
                return (
                    <PostModule
                        // Filters on caption, not content. Post has no `content`
                        // field, so this search silently matched nothing except
                        // by author.
                        posts={posts.filter(p =>
                            (p.caption || '').toLowerCase().includes(search.toLowerCase()) ||
                            (p.author?.username || '').toLowerCase().includes(search.toLowerCase())
                        )}
                        onDelete={handleDeletePost}
                        contentType={contentType}
                        setContentType={setContentType}
                        search={search}
                        setSearch={setSearch}
                        loading={loading}
                    />
                )
            case 'comments':
                return (
                    <CommentModule
                        // Comment stores its text in `body`, not `content`, so
                        // this search matched nothing at all before.
                        comments={comments.filter(c =>
                            (c.body || '').toLowerCase().includes(search.toLowerCase()) ||
                            (c.author?.username || '').toLowerCase().includes(search.toLowerCase())
                        )}
                        onDelete={handleDeleteComment}
                        search={search}
                        setSearch={setSearch}
                        loading={loading}
                    />
                )
            case 'reports':
                return (
                    <ReportModule
                        reports={reports}
                        onResolve={handleResolveReport}
                        loading={loading}
                    />
                )
            case 'infrastructure':
                return <InfrastructureModule pulse={pulse} />
            case 'audit':
                return <AuditModule logs={logs} loading={loading} />
            case 'settings':
                return (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="admin-surface-el p-10 bg-gradient-to-br from-accent/[0.03] to-transparent">
                                <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-8">Platform Identity</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-5 bg-surface-subtle rounded-2xl border border-subtle">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Environment</span>
                                        <span className="text-[11px] font-black text-accent uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 border border-accent/20">Production-PN</span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-surface-subtle rounded-2xl border border-subtle">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Registry Lock</span>
                                        <div className="w-10 h-5 bg-success/20 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-3 h-3 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="admin-surface-el p-10 border-dashed border-error/20 bg-error/[0.02]">
                                <h3 className="text-xl font-black text-error uppercase tracking-tighter mb-8">Danger Zone</h3>
                                <p className="text-[12px] text-muted font-bold mb-10 opacity-50 leading-relaxed">High-risk administrative operations. All executions are recorded to the permanent system registry.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { setSystemActionType('users'); setShowSystemModal(true); }}
                                        className="py-4 bg-error/5 text-error text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-error/10 hover:bg-error hover:text-white transition-all"
                                    >
                                        Purge Identities
                                    </button>
                                    <button
                                        onClick={() => { setSystemActionType('full'); setShowSystemModal(true); }}
                                        className="py-4 bg-error text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Factory Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    if (loading && !stats) {
        return (
            <div className="admin-root-v2">
                {/* Sidebar Skeleton */}
                <aside className="sidebar admin-sidebar-override">
                    <div className="px-4 mb-8">
                        <div className="skeleton h-4 w-24 mb-2 rounded-full opacity-50" />
                        <div className="skeleton h-8 w-32 rounded-xl" />
                    </div>
                    <div className="space-y-6 px-2">
                        {[1, 2, 3].map(g => (
                            <div key={g} className="space-y-3">
                                <div className="skeleton h-3 w-16 ml-2 opacity-30" />
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="skeleton h-12 w-full rounded-2xl opacity-40" />
                                ))}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="admin-main-col">
                    <div className="admin-content-inner p-6 md:p-12 space-y-12">
                        <header className="flex justify-between items-end pb-8 border-b border-white/5">
                            <div className="space-y-4">
                                <div className="skeleton h-4 w-32 rounded-full opacity-50" />
                                <div className="skeleton h-12 w-64 rounded-2xl" />
                            </div>
                            <div className="flex gap-4">
                                <div className="skeleton h-12 w-12 rounded-2xl" />
                                <div className="skeleton h-12 w-48 rounded-2xl" />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton h-48 rounded-[32px]" />
                            ))}
                        </div>
                        <div className="skeleton h-[400px] rounded-[40px]" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="admin-root-v2 h-screen overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                pulse={stats?.health}
                stats={stats}
                reports={reports}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />



            {/* Main Content Area */}
            <main className="admin-main-col h-[100dvh] overflow-y-auto custom-scrollbar">
                <div className="px-4 pt-2 pb-4 md:px-10 md:pt-4 md:pb-10 max-w-[1700px] mx-auto">
                    {/* Page Header */}
                    <header className="flex items-center justify-between gap-4 mb-4 md:mb-6 border-b border-subtle pb-4 md:pb-5">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setIsSidebarOpen(prev => !prev)}
                                className={`lg:hidden p-4 rounded-2xl bg-admin-card border text-primary shadow-xl transition-all ${isSidebarOpen ? 'border-accent bg-accent/5' : 'border-admin-border'}`}
                            >
                                <HiMenu size={24} />
                            </button>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-[2px] bg-accent" />
                                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Admin Console</span>
                                </div>
                                <h1 className="admin-h1-v2">
                                    {navGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || activeTab}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => init()}
                                className="w-12 h-12 rounded-2xl bg-surface-subtle border border-subtle flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-all group"
                                title="Refresh Data"
                            >
                                <HiRefresh size={20} className="group-hover:rotate-180 transition-all duration-700" />
                            </button>
                            <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-subtle">
                                <div className="text-right">
                                    <div className="text-xs font-black text-primary uppercase tracking-tight">@{user?.username}</div>
                                    <div className="text-[9px] font-bold text-success uppercase tracking-widest">Platform Admin</div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black shadow-lg shadow-accent/20">
                                    {user?.username?.substring(0, 2).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </header>


                    {/* Module Render */}
                    <div>{renderModule()}</div>

                    <footer className="mt-20 py-10 border-t border-white/5 opacity-40">
                        <div className="max-w-[1700px] mx-auto">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Infrastructure</span>
                                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase">v2.0.0-GOV</span>
                                    </div>
                                    <div className="h-10 w-[1px] bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Status</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[11px] font-bold text-success uppercase tracking-widest">Nominal</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-[0.4em] opacity-20">© 2026 PeerNet Admin • Restricted Infrastructure Access</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </main>

            {/* Global Overlays */}
            <AnimatePresence>
                {/* Delete Confirmation */}
                {showDeleteModal && (
                    <ConfirmDeleteModal
                        onClose={() => setShowDeleteModal(false)}
                        onConfirm={handleDeleteUser}
                    />
                )}

                {/* System Authentication */}
                {showSystemModal && (
                    <SystemActionModal
                        actionType={systemActionType}
                        confirmCode={systemConfirmCode}
                        setConfirmCode={setSystemConfirmCode}
                        adminPassword={systemAdminPassword}
                        setAdminPassword={setSystemAdminPassword}
                        isExecuting={isExecutingSystem}
                        onClose={() => setShowSystemModal(false)}
                        onExecute={handleSystemAction}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
