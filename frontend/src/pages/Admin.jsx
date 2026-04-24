import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiTrash, 
    HiBadgeCheck, HiRefresh,
    HiLightningBolt, HiArrowRight,
    HiExclamation,
    HiKey, HiDatabase, HiGlobe, HiSearch,
    HiChatAlt2, HiFlag, HiTrendingUp, HiCog, HiShieldCheck,
    HiCheck, HiX, HiBan, HiSpeakerphone
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

// --- SaaS Components ---

const AdminSidebar = ({ activeTab, setActiveTab }) => {
    const navGroups = [
        {
            title: 'Insights',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: <HiGlobe /> },
                { id: 'analytics', label: 'Analytics', icon: <HiTrendingUp /> }
            ]
        },
        {
            title: 'Management',
            items: [
                { id: 'users', label: 'Users', icon: <HiUsers /> },
                { id: 'posts', label: 'Posts', icon: <HiCollection /> },
                { id: 'comments', label: 'Comments', icon: <HiChatAlt2 /> },
                { id: 'reports', label: 'Reports', icon: <HiFlag /> }
            ]
        },
        {
            title: 'Infrastructure',
            items: [
                { id: 'storage', label: 'Storage', icon: <HiDatabase /> },
                { id: 'security', label: 'Security Logs', icon: <HiShieldCheck /> }
            ]
        },
        {
            title: 'Platform',
            items: [
                { id: 'settings', label: 'Settings', icon: <HiCog /> }
            ]
        }
    ]

    return (
        <aside className="w-full lg:w-56 flex flex-row lg:flex-col gap-6 lg:gap-10 sticky top-16 lg:top-24 h-fit overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide border-b lg:border-none border-white/5 bg-black lg:bg-transparent z-10 -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="flex flex-row lg:flex-col gap-8 flex-nowrap">
                {navGroups.map(group => (
                    <div key={group.title} className="flex flex-row lg:flex-col gap-3 items-center lg:items-start flex-nowrap whitespace-nowrap">
                        <h5 className="hidden lg:block px-4 text-[9px] font-bold text-text-3 uppercase tracking-[0.2em] opacity-30">
                            {group.title}
                        </h5>
                        <nav className="flex flex-row lg:flex-col gap-1 flex-nowrap">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`relative flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-[11px] lg:text-[12px] font-bold transition-all group shrink-0 ${
                                        activeTab === item.id 
                                        ? 'text-white bg-white/[0.04]' 
                                        : 'text-text-3 hover:text-white hover:bg-white/[0.02]'
                                    }`}
                                >
                                    {activeTab === item.id && (
                                        <motion.div 
                                            layoutId="active-nav-bar"
                                            className="absolute left-0 bottom-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 w-full h-[2px] lg:w-[2px] lg:h-3 bg-accent rounded-full"
                                        />
                                    )}
                                    <span className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110 text-accent' : 'group-hover:scale-110 opacity-40 group-hover:opacity-100'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="tracking-tight">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                        <div className="lg:hidden w-px h-4 bg-white/5 mx-2" />
                    </div>
                ))}
            </div>

            <div className="hidden lg:block mt-2 p-4 rounded-xl border border-white/5 bg-white/[0.01] relative overflow-hidden group/status">
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover/status:opacity-100 transition-opacity" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest opacity-40">System</h4>
                        <div className="status-dot-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight">Active Pulse</span>
                        <span className="text-[9px] font-medium text-text-3 opacity-30 uppercase tracking-tighter">Global Infra</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}

const Sparkline = ({ data = [], color = '#00F0FF' }) => {
    if (!data || data.length < 2) return <div className="h-4" />
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 100
    const height = 30
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 opacity-50 overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    )
}

const StatSkeleton = () => (
    <div className="admin-stat-card animate-pulse opacity-50">
        <div className="flex justify-between items-center mb-4">
            <div className="h-2 w-12 bg-white/5 rounded-full" />
            <div className="h-4 w-4 bg-white/5 rounded-full" />
        </div>
        <div className="h-8 w-16 bg-white/10 rounded-lg mb-2" />
        <div className="h-2 w-14 bg-white/5 rounded-full" />
    </div>
)

const TableRowSkeleton = () => (
    <div className="flex items-center gap-6 py-4 px-6 border-b border-white/5 opacity-30">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-white/10 rounded" />
            <div className="h-2 w-48 bg-white/5 rounded" />
        </div>
        <div className="h-3 w-16 bg-white/5 rounded" />
        <div className="h-8 w-24 bg-white/5 rounded-lg" />
    </div>
)

const PostSkeleton = () => (
    <div className="admin-surface-el overflow-hidden animate-pulse opacity-30">
        <div className="aspect-[4/5] bg-white/[0.02]" />
        <div className="p-4 space-y-3">
            <div className="h-3 w-3/4 bg-white/10 rounded" />
            <div className="h-2 w-1/2 bg-white/5 rounded" />
        </div>
    </div>
)

const StatCard = ({ label, value, sub, icon, trend, chartData, color = 'accent', accent }) => (
    <div className={`admin-stat-card group ${accent ? 'border-red-500/30 bg-red-500/5' : ''}`}>
        <div className="flex items-center justify-between mb-3">
            <span className="admin-stat-label">{label}</span>
            <div className={`text-text-3 group-hover:text-${color === 'accent' ? 'accent' : 'success'} transition-colors opacity-40`}>
                {icon}
            </div>
        </div>
        <div className="flex items-end justify-between gap-2">
            <div>
                <span className="admin-stat-value">{value}</span>
                <span className="text-[9px] font-bold text-text-3 opacity-30 uppercase tracking-tighter block mt-0.5">{sub}</span>
            </div>
            {chartData && (
                <div className="w-12 mb-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={chartData} color={color === 'accent' ? '#00F0FF' : color === 'success' ? '#10B981' : '#8B5CF6'} />
                </div>
            )}
        </div>
    </div>
)

export default function Admin() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [feedback, setFeedback] = useState([])
    const [reports, setReports] = useState([])
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [contentType, setContentType] = useState('all')

    // System Protection State
    const [showSystemModal, setShowSystemModal] = useState(false)
    const [systemActionType, setSystemActionType] = useState('')
    const [systemConfirmCode, setSystemConfirmCode] = useState('')
    const [systemAdminPassword, setSystemAdminPassword] = useState('')
    const [isExecutingSystem, setIsExecutingSystem] = useState(false)
    
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [targetUserId, setTargetUserId] = useState(null)

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats')
            if (data.success) setStats(data.data)
        } catch {
            toast.error('Failed to load system metrics')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/users?search=${q}`)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('Failed to connect to user database')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await api.get(`/admin/posts?type=${type}`)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to load moderation feed')
        }
    }, [])

    const fetchFeedback = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/feedback')
            if (data.success) setFeedback(data.items)
        } catch {
            toast.error('Feedback queue inaccessible')
        }
    }, [])

    const fetchReports = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/reports?status=pending')
            if (data.success) setReports(data.reports || [])
        } catch {
            toast.error('Failed to load pending reports')
        }
    }, [])

    const fetchLogs = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/logs')
            if (data.success) setLogs(data.logs || [])
        } catch {
            toast.error('Audit trail disconnected')
        }
    }, [])

    const handleResolveReport = async (reportId, status, resolution = '') => {
        try {
            await api.patch(`/admin/reports/${reportId}`, { status, resolution })
            toast.success(`Report ${status}`)
            fetchReports()
        } catch {
            toast.error('Action failed')
        }
    }

    const handleModerationAction = async (report, action) => {
        const targetId = report.targetId?._id || report.targetId
        const userId = report.targetId?.author?._id || report.targetId?._id

        try {
            if (action === 'remove') {
                const endpoint = report.targetType === 'Post' ? `/admin/posts/${targetId}` : 
                               report.targetType === 'Comment' ? `/admin/comments/${targetId}` : 
                               `/admin/stories/${targetId}`
                await api.delete(endpoint)
                await handleResolveReport(report._id, 'resolved', 'Content removed by admin')
            } else if (action === 'warn') {
                const message = prompt('Enter warning message for the user:', 'Your content has been flagged for violating community guidelines.')
                if (!message) return
                await api.post(`/admin/users/${userId}/warn`, { message })
                toast.success('Warning sent')
            } else if (action === 'ban') {
                if (!window.confirm('Are you sure you want to BAN this user?')) return
                await api.patch(`/admin/users/${userId}/status`, { status: 'banned', reason: 'Repeated violations' })
                await handleResolveReport(report._id, 'resolved', 'User banned')
            } else if (action === 'approve') {
                await handleResolveReport(report._id, 'dismissed', 'Content approved after review')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Moderation action failed')
        }
    }

    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([fetchStats(), fetchUsers(), fetchPosts(contentType), fetchFeedback(), fetchReports(), fetchLogs()])
        setLoading(false)
    }, [fetchStats, fetchUsers, fetchPosts, fetchFeedback, fetchReports, fetchLogs, contentType])

    useEffect(() => {
        init()
    }, [init])

    // --- Core Actions ---

    const handleDeleteUser = async () => {
        if (!targetUserId) return
        try {
            await api.delete(`/admin/users/${targetUserId}`)
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
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Post removed from platform')
            fetchPosts(contentType)
            fetchReports()
            fetchStats()
            fetchUsers()
        } catch {
            toast.error('Removal failed')
        }
    }

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('Validation status updated')
            fetchUsers(search)
        } catch {
            toast.error('Validation update failed')
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
            const { data } = await api.delete('/admin/infrastructure/nuke', {
                data: { 
                    type: systemActionType, 
                    confirmationCode: systemConfirmCode,
                    adminPassword: systemAdminPassword
                }
            })
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

    if (loading && !stats) {
        return (
            <div className="admin-page min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
                <header className="mb-10 opacity-30">
                    <div className="h-2 w-16 bg-white/10 rounded-full mb-3" />
                    <div className="h-7 w-56 bg-white/10 rounded-lg" />
                </header>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-12">
                    {[...Array(7)].map((_, i) => <StatSkeleton key={i} />)}
                </div>
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="w-56 h-80 bg-white/[0.015] rounded-xl hidden lg:block opacity-20" />
                    <div className="flex-1 space-y-2">
                        {[...Array(6)].map((_, i) => <TableRowSkeleton key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-page min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
            
            {/* --- DASHBOARD HEADER --- */}
            <header className="mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-3 opacity-50">
                            <span className="text-accent">System Infrastructure</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>v1.0.0-STABLE</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-tighter mb-2">Administrative Governance</h1>
                        <p className="text-text-3 font-medium text-xs uppercase tracking-widest opacity-40">System-wide monitoring & policy enforcement</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={init} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-[10px] font-black uppercase tracking-widest">
                            <HiRefresh size={14} className={loading ? 'animate-spin' : ''} /> 
                            Manual Sync
                        </button>
                    </div>
                </div>
            </header>

            {/* --- CORE METRICS HUB --- */}
            <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-12">
                <StatCard 
                    label="Active Users" 
                    value={(stats?.totalUsers || 0).toLocaleString()} 
                    sub="NETWORK CAPACITY" 
                    icon={<HiUsers size={12} />} 
                    chartData={stats?.charts?.userGrowth?.map(d => d.count)}
                />
                <StatCard 
                    label="Signups" 
                    value={stats?.signupsToday || 0} 
                    sub="24H GROWTH" 
                    icon={<HiTrendingUp size={12} />} 
                    color="success"
                />
                <StatCard 
                    label="Active" 
                    value={stats?.activeToday || 0} 
                    sub="SESSIONS" 
                    icon={<HiGlobe size={12} />} 
                />
                <StatCard 
                    label="Posts" 
                    value={(stats?.totalPosts || 0).toLocaleString()} 
                    sub="TOTAL VOID" 
                    icon={<HiCollection size={12} />} 
                    chartData={stats?.charts?.postGrowth?.map(d => d.count)}
                />
                <StatCard 
                    label="Comments" 
                    value={stats?.commentsToday || 0} 
                    sub="DAILY ECHO" 
                    icon={<HiChatAlt2 size={12} />} 
                />
                <StatCard 
                    label="Reports" 
                    value={stats?.pendingReports || 0} 
                    accent={stats?.pendingReports > 0}
                />
            </section>

            <div className="flex flex-col lg:flex-row gap-12 items-start">
                {/* --- NAVIGATION --- */}
                <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* --- MAIN INTERFACE --- */}
                <main className="flex-1 min-h-[600px]">
                    <AnimatePresence mode="wait">
                        
                        {/* DASHBOARD MODULE */}
                        {activeTab === 'dashboard' && (
                            <motion.div key="dashboard" className="space-y-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Recent Activity */}
                                    <div className="xl:col-span-2 admin-surface-el p-6 md:p-8">
                                        <div className="flex justify-between items-center mb-10">
                                            <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-3">
                                                <HiGlobe className="text-accent" /> Platform Velocity
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {feedback.slice(0, 5).map(f => (
                                                <div key={f._id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] transition-all group">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,240,255,0.4)] shrink-0" />
                                                        <div className="flex flex-col min-w-0">
                                                            <p className="text-[13px] text-white font-medium truncate mb-0.5">{f.content}</p>
                                                            <span className="text-[9px] font-bold text-text-3 uppercase tracking-widest opacity-40">@{f.userId?.username || 'SYSTEM INTEGRITY'} • SIGNAL AUDIT</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <HiArrowRight className="text-text-3" size={12} />
                                                    </div>
                                                </div>
                                            ))}
                                            {feedback.length === 0 && <div className="text-center py-24 opacity-20 text-[10px] font-black uppercase tracking-[0.3em]">No Pulse Detected</div>}
                                        </div>
                                    </div>

                                    {/* High-Level Analysis */}
                                    <div className="admin-surface-el p-6 md:p-8 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-10">Integrity Indices</h3>
                                            <div className="space-y-8">
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-bold text-text-3 uppercase tracking-[0.2em] mb-3 opacity-40">
                                                        <span>Network Synchronicity</span>
                                                        <span className="text-success">{stats?.health?.synchronicity || 0}%</span>
                                                    </div>
                                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${stats?.health?.synchronicity || 0}%` }} className="h-full bg-success opacity-60" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-bold text-text-3 uppercase tracking-[0.2em] mb-3 opacity-40">
                                                        <span>Allocation Quota</span>
                                                        <span className="text-accent">{stats?.storage?.percentage || 0}%</span>
                                                    </div>
                                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${stats?.storage?.percentage || 0}%` }} className="h-full bg-accent opacity-60" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-10 p-5 rounded-xl bg-accent/5 border border-accent/10">
                                            <div className="flex items-center gap-3 mb-2">
                                                <HiShieldCheck size={14} className="text-accent" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Protocol {stats?.health?.status || 'Online'}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-text-3 uppercase tracking-tight leading-relaxed opacity-50">Infrastructure operating within nominal parameters.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* IDENTITY MODULE */}
                        {activeTab === 'users' && (
                            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 mb-10">
                                    <div className="relative flex-1">
                                        <HiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-text-3 opacity-40" />
                                        <input 
                                            className="w-full bg-white/[0.02] border border-white/5 text-sm font-medium rounded-xl pl-16 pr-8 py-4 outline-none focus:border-accent transition-all placeholder-text-3" 
                                            placeholder="Search user accounts..." 
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value)
                                                fetchUsers(e.target.value)
                                            }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>User Account</th>
                                                <th>Status</th>
                                                <th>Access Level</th>
                                                <th className="text-right">Management</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="4" className="p-0">{[...Array(6)].map((_, i) => <TableRowSkeleton key={i} />)}</td></tr>
                                            ) : users.map(u => (
                                                <tr key={u._id} className="hover:bg-white/[0.01] transition-colors group">
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/5 bg-white/[0.02] flex items-center justify-center group-hover:border-white/20 transition-all">
                                                                <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=0A0A0A&color=fff`} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white text-[13px] tracking-tight lowercase">@{u.username}</span>
                                                                <span className="text-[10px] text-text-3 font-medium opacity-40">{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${u.isVerified ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${u.isVerified ? 'text-success' : 'text-text-3 opacity-40'}`}>
                                                                {u.isVerified ? 'Verified' : 'Unverified'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${u.role === 'admin' ? 'bg-accent/5 text-accent border-accent/20' : 'bg-white/5 border-white/10 text-text-3'}`}>
                                                            {u.role || 'user'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleToggleVerify(u._id)} title="Update Clearance" className="p-1.5 border border-white/5 rounded-lg hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all text-text-3">
                                                                <HiKey size={13} />
                                                            </button>
                                                            <button onClick={() => { setTargetUserId(u._id); setShowDeleteModal(true); }} title="Terminate" className="p-1.5 border border-white/5 rounded-lg hover:bg-error/10 hover:text-error hover:border-error/20 transition-all text-text-3">
                                                                <HiTrash size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* POSTS MODULE */}
                        {activeTab === 'posts' && (
                            <motion.div key="posts" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6 overflow-x-auto">
                                    {['all', 'image', 'video'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => { setContentType(t); fetchPosts(t); }}
                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${contentType === t ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-text-3 hover:text-white'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {posts.map(p => (
                                        <div key={p._id} className="admin-surface-el overflow-hidden group hover:border-white/10 transition-all">
                                            <div className="aspect-[4/5] relative bg-black">
                                                {p.mediaType === 'video' ? (
                                                    <video src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <img src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                                )}
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                    <button onClick={() => handleDeletePost(p._id)} className="p-2.5 bg-error text-white rounded-lg shadow-xl hover:scale-105 active:scale-95" title="Delete Post">
                                                        <HiTrash size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-white/5">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5">
                                                        <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=0A0A0A&color=fff`} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[12px] font-black text-white truncate lowercase">@{p.author?.username}</span>
                                                        <span className="text-[8px] font-bold text-text-3 uppercase opacity-30 mt-[-2px]">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-text-3 font-medium line-clamp-1 opacity-50 italic">&ldquo;{p.caption || 'No description provided.'}&rdquo;</p>
                                            </div>
                                        </div>
                                    ))}
                                    {posts.length === 0 && <div className="col-span-full py-32 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.4em]">Broadcast Vault Offline</div>}
                                </div>
                            </motion.div>
                        )}

                        {/* COMMENTS MODULE (STUB) */}
                        {activeTab === 'comments' && (
                            <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="admin-surface-el p-20 text-center opacity-20">
                                    <HiChatAlt2 size={40} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Comment Management Under Development</p>
                                </div>
                            </motion.div>
                        )}

                        {/* REPORTS MODULE */}
                        {activeTab === 'reports' && (
                            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Content Moderation</h3>
                                        <p className="text-xs font-medium text-text-3 opacity-40 uppercase tracking-widest mt-1">Review flagged items</p>
                                    </div>
                                    <div className="bg-accent/10 px-4 py-2 rounded-full border border-accent/20">
                                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{reports.length} Pending Reports</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {reports.map((report) => (
                                        <div key={report._id} className="admin-surface-el p-6 flex flex-col xl:flex-row gap-6 group hover:border-white/10 transition-all">
                                            {/* Content Preview */}
                                            <div className="w-full xl:w-48 shrink-0 aspect-video rounded-lg bg-black border border-white/5 overflow-hidden relative group-hover:border-accent/20 transition-all">
                                                {report.targetType === 'Post' || report.targetType === 'Story' ? (
                                                    report.targetId?.mediaType === 'video' ? (
                                                        <video src={report.targetId?.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <img src={report.targetId?.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                                    )
                                                ) : report.targetType === 'Comment' ? (
                                                    <div className="p-4 text-[10px] text-text-3 font-medium line-clamp-4 italic leading-relaxed opacity-60">
                                                        &ldquo;{report.targetId?.content}&rdquo;
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-text-3/10 uppercase font-black tracking-tighter text-[10px]">Registry Alert</div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-accent/90 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-xl tracking-tighter">
                                                    {report.targetType}
                                                </div>
                                            </div>

                                            {/* Report Details */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1 h-1 rounded-full ${report.priority === 'urgent' ? 'bg-error animate-pulse' : 'bg-accent'}`} />
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{report.reason}</span>
                                                        </div>
                                                        <span className="text-[9px] font-medium text-text-3 opacity-20 uppercase">REC: {new Date(report.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[12px] text-text-3 font-medium leading-relaxed mb-4 p-3 rounded-lg bg-white/[0.01] border border-white/5 opacity-70">
                                                        {report.description || 'No specialized metadata provided.'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-30">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>Signal:</span>
                                                            <span className="text-white">@{report.reporter?.username}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span>Target:</span>
                                                            <span className="text-accent">@{report.targetId?.author?.username || report.targetId?.username || 'SYSTEM'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-6">
                                                    <button 
                                                        onClick={() => handleModerationAction(report, 'approve')}
                                                        className="flex-1 py-2.5 bg-accent/5 border border-accent/10 text-accent font-black text-[9px] tracking-widest rounded-lg hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <HiCheck size={12} /> CLEAR
                                                    </button>
                                                    <button 
                                                        onClick={() => handleModerationAction(report, 'warn')}
                                                        className="flex-1 py-2.5 bg-white/[0.02] border border-white/5 text-text-3 font-black text-[9px] tracking-widest rounded-lg hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <HiSpeakerphone size={12} /> WARN
                                                    </button>
                                                    <button 
                                                        onClick={() => handleModerationAction(report, 'remove')}
                                                        className="flex-1 py-2.5 bg-error/5 border border-error/10 text-error font-black text-[9px] tracking-widest rounded-lg hover:bg-error hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <HiTrash size={12} /> PURGE
                                                    </button>
                                                    <button 
                                                        onClick={() => handleModerationAction(report, 'ban')}
                                                        className="p-2.5 bg-error shrink-0 text-white rounded-lg hover:scale-[1.05] active:scale-[0.95] transition-all"
                                                        title="Terminate Access"
                                                    >
                                                        <HiBan size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {reports.length === 0 && (
                                        <div className="admin-surface-el p-40 text-center opacity-20 flex flex-col items-center">
                                            <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/20 mb-8 animate-spin-slow" />
                                            <p className="text-sm font-bold uppercase tracking-[0.5em]">No Pending Reports</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STORAGE MODULE (STUB) */}
                        {activeTab === 'storage' && (
                            <motion.div key="storage" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="admin-surface-el p-12 text-center opacity-20 border-dashed">
                                    <HiDatabase size={24} className="mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Infrastructure Registry</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ANALYTICS MODULE (STUB) */}
                        {activeTab === 'analytics' && (
                            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="admin-surface-el p-12 text-center opacity-20 border-dashed">
                                    <HiTrendingUp size={24} className="mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Intelligence Engine Syncing</p>
                                </div>
                            </motion.div>
                        )}

                        {/* SECURITY MODULE */}
                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="admin-table-container">
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Administrative Audit Trail</h3>
                                        <span className="text-[10px] font-bold text-text-3 opacity-30 uppercase tracking-[0.2em]">Live Registry</span>
                                    </div>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Administrator</th>
                                                <th>Operation</th>
                                                <th>Target</th>
                                                <th className="text-right">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="4" className="p-0">{[...Array(8)].map((_, i) => <TableRowSkeleton key={i} />)}</td></tr>
                                            ) : logs.map(log => (
                                                <tr key={log._id} className="hover:bg-white/[0.01]">
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded overflow-hidden bg-white/5">
                                                                <img src={log.adminId?.avatarUrl || `https://ui-avatars.com/api/?name=${log.adminId?.username}&background=0A0A0A&color=fff`} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-white lowercase">@{log.adminId?.username || 'system'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-accent uppercase tracking-tighter">{log.action}</span>
                                                            <span className="text-[9px] text-text-3 opacity-40 truncate max-w-xs">{log.details}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="text-[9px] font-bold text-text-3 uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5">{log.targetType}</span>
                                                    </td>
                                                    <td className="text-right">
                                                        <span className="text-[10px] font-medium text-text-3 opacity-40 uppercase">{new Date(log.createdAt).toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {logs.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan="4" className="py-32 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.4em]">Audit Trail Empty</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* SETTINGS / DANGER ZONE */}
                        {activeTab === 'settings' && (
                            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {/* Profile Settings (Placeholder for Logic) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    <div className="admin-surface-el p-6 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest opacity-40">Regional Config</h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] font-medium text-white">Cloud Sync</span>
                                            <div className="w-8 h-4 bg-accent/20 rounded-full relative"><div className="absolute right-1 top-1 w-2 h-2 bg-accent rounded-full" /></div>
                                        </div>
                                    </div>
                                    <div className="admin-surface-el p-6 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest opacity-40">Telemetry</h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] font-medium text-white">Live Logs</span>
                                            <div className="w-8 h-4 bg-white/5 rounded-full relative"><div className="absolute left-1 top-1 w-2 h-2 bg-white/20 rounded-full" /></div>
                                        </div>
                                    </div>
                                    <div className="admin-surface-el p-6 flex flex-col gap-4 border-dashed border-white/5">
                                        <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest opacity-20">Extensions</h4>
                                        <span className="text-[11px] font-medium text-white opacity-20 italic">No modules detected</span>
                                    </div>
                                </div>

                                {/* Restricted Hero */}
                                <div className="mb-8 p-8 rounded-2xl bg-error/[0.04] border border-error/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                        <HiShieldCheck size={120} className="text-error" />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                            <h3 className="text-[10px] font-bold text-error uppercase tracking-widest">Restricted Area</h3>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-4 tracking-tighter uppercase">Infrastructure Operations</h2>
                                        <p className="text-[13px] text-text-3 font-medium max-w-xl leading-relaxed opacity-50">
                                            Irrevocable actions on global platform state. Authorization required for all execution strings.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { 
                                            id: 'users', 
                                            label: 'Wipe User Base', 
                                            desc: 'Permanently remove all platform users and profile metadata.',
                                            icon: <HiUsers size={20} />
                                        },
                                        { 
                                            id: 'content', 
                                            label: 'Clear Media Store', 
                                            desc: 'Purge all posts, stories, and comments from network buckets.',
                                            icon: <HiDatabase size={20} />
                                        }
                                    ].map((action) => (
                                        <div key={action.id} className="admin-surface-el p-6 hover:border-error/30 transition-all group flex flex-col justify-between">
                                            <div>
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-text-3 group-hover:text-error group-hover:border-error/20 transition-all mb-6">
                                                    {action.icon}
                                                </div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">{action.label}</h4>
                                                <p className="text-[11px] text-text-3 font-medium leading-relaxed opacity-40 mb-8">{action.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setSystemActionType(action.id)
                                                    setSystemConfirmCode('')
                                                    setSystemAdminPassword('')
                                                    setShowSystemModal(true)
                                                }}
                                                className="w-full py-3 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-black text-text-3 hover:bg-error hover:border-error hover:text-white transition-all uppercase tracking-[0.2em]"
                                            >
                                                Initialize
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-6 rounded-2xl bg-error/[0.03] border border-error/10 hover:border-error/20 transition-all group">
                                    <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
                                        <div className="flex gap-4 items-center text-center xl:text-left">
                                            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error shrink-0">
                                                <HiRefresh size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-white uppercase tracking-tight">Full Factory Reset</h4>
                                                <p className="text-[10px] font-bold text-text-3 mt-1 opacity-40 uppercase tracking-[0.05em]">Complete network purge and infrastructure reset.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setSystemActionType('full')
                                                setSystemConfirmCode('')
                                                setSystemAdminPassword('')
                                                setShowSystemModal(true)
                                            }}
                                            className="w-full xl:w-auto px-10 py-4 bg-error text-white font-black text-[10px] tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-error/20 uppercase">
                                            Execute
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                    </AnimatePresence>
                </main>
            </div>

            {/* --- CORE MODALS --- */}
            
            <AnimatePresence>
                {/* Purge Confirmation */}
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-md admin-surface-el p-12 text-center shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tighter">Confirm Deletion?</h2>
                            <p className="text-text-3 font-medium text-sm mb-10 leading-relaxed">This user account and all their content will be permanently removed from the platform.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 rounded-lg border border-white/5 font-bold text-[10px] tracking-widest uppercase hover:bg-white/5" onClick={() => setShowDeleteModal(false)}>Abort</button>
                                <button className="py-4 rounded-lg bg-error text-white font-bold text-[10px] tracking-widest uppercase" onClick={handleDeleteUser}>Confirm</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* System Authentication */}
                {showSystemModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-zinc-950 border border-error/30 rounded-[32px] overflow-hidden shadow-2xl shadow-error/10"
                        >
                            <div className="p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
                                        <HiShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Access Clearance Required</h3>
                                        <p className="text-[10px] font-bold text-error uppercase tracking-[0.3em] mt-1">High-Risk Operation: {systemActionType}</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Security Step 1 */}
                                    <div>
                                        <label className="block text-[10px] font-black text-text-3 uppercase tracking-widest mb-4">
                                            1. Type <span className="text-white">DELETE</span> to confirm
                                        </label>
                                        <input 
                                            type="text"
                                            value={systemConfirmCode}
                                            onChange={(e) => setSystemConfirmCode(e.target.value)}
                                            placeholder="DELETE"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-white focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-20"
                                        />
                                    </div>

                                    {/* Security Step 2 */}
                                    <div>
                                        <label className="block text-[10px] font-black text-text-3 uppercase tracking-widest mb-4">
                                            2. Verify Administrator Identity
                                        </label>
                                        <input 
                                            type="password"
                                            value={systemAdminPassword}
                                            onChange={(e) => setSystemAdminPassword(e.target.value)}
                                            placeholder="Enter Administrator Password"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-white focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-20"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-12">
                                    <button 
                                        onClick={() => setShowSystemModal(false)}
                                        className="flex-1 py-4 text-[11px] font-black text-text-3 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        disabled={systemConfirmCode !== 'DELETE' || !systemAdminPassword || isExecutingSystem}
                                        onClick={handleSystemAction}
                                        className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                                            systemConfirmCode === 'DELETE' && systemAdminPassword
                                            ? 'bg-error text-white shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95'
                                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        {isExecutingSystem ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>EXECUTE PURGE</>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-error/5 p-4 border-t border-error/10 text-center">
                                <p className="text-[9px] font-bold text-error uppercase tracking-widest opacity-60">This action will be logged in the permanent audit trail</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AdminFooter user={user} />
        </div>
    )
}

const AdminFooter = ({ user }) => {
    return (
        <footer className="mt-20 py-10 border-t border-white/5 opacity-40">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-text-3 uppercase tracking-[0.2em] mb-1.5 opacity-50">Infrastructure</span>
                        <span className="text-[11px] font-bold text-white tracking-widest uppercase">v1.0.0-PROD</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-text-3 uppercase tracking-[0.2em] mb-1.5 opacity-50">Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-bold text-success uppercase tracking-widest">Nominal</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right hidden md:block">
                        <span className="text-[9px] font-bold text-text-3 uppercase tracking-[0.2em] block mb-1.5 opacity-50">Registry Sync</span>
                        <span className="text-[11px] font-bold text-white tracking-widest lowercase">Last: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-white/5 px-5 py-2.5 rounded-xl border border-white/5 flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-text-3 uppercase tracking-[0.2em] mb-0.5 opacity-50">Session Operator</span>
                            <span className="text-[12px] font-bold text-accent tracking-tight">@{user?.username}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-12 text-center">
                <p className="text-[9px] font-bold text-text-3 uppercase tracking-[0.4em] opacity-20">© 2026 PeerNet Governance • Restricted Infrastructure Access</p>
            </div>
        </footer>
    )
}
