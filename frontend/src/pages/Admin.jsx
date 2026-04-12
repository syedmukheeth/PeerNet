import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiChartBar, HiTrash, 
    HiBadgeCheck, HiRefresh, HiCheckCircle, HiInbox,
    HiLightningBolt, HiShieldCheck, HiArrowRight,
    HiPhotograph, HiVideoCamera, HiChevronRight
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Admin() {
    const [activeTab, setActiveTab] = useState('overview')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [contentType, setContentType] = useState('all')

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats')
            if (data.success) setStats(data.data)
        } catch {
            toast.error('Failed to fetch platform stats')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/users?search=${q}`)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('Failed to fetch users')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await api.get(`/admin/posts?type=${type}`)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to fetch content')
        }
    }, [])

    const fetchFeedback = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/feedback')
            if (data.success) setFeedback(data.items)
        } catch {
            toast.error('Failed to fetch reports')
        }
    }, [])

    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([fetchStats(), fetchUsers(), fetchPosts(contentType), fetchFeedback()])
        setLoading(false)
    }, [fetchStats, fetchUsers, fetchPosts, fetchFeedback, contentType])

    useEffect(() => {
        init()
    }, [init])

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('CRITICAL: Purge this node? This action cannot be undone.')) return
        try {
            await api.delete(`/admin/users/${userId}`)
            toast.success('Node purged from network')
            init()
        } catch {
            toast.error('Purge operation failed')
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Content redacted')
            fetchPosts(contentType)
            fetchStats()
        } catch {
            toast.error('Deletion failed')
        }
    }

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('Auth status updated')
            fetchUsers(search)
        } catch {
            toast.error('Verification toggle failed')
        }
    }

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
                <div className="spinner" />
                <p className="t-small animate-pulse">Synchronizing Platform State...</p>
            </div>
        )
    }

    return (
        <div className="admin-page fade-in pb-20">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="t-heading flex items-center gap-3" style={{ fontSize: 32 }}>
                        <HiShieldCheck className="text-accent" />
                        Infrastructure Governance
                    </h1>
                    <p className="t-small mt-1" style={{ opacity: 0.6 }}>Production Node Management & Global Moderation Console</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn btn-secondary btn-sm" onClick={init}>
                        <HiRefresh /> Refetch Data
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-[11px] font-bold border border-success/20">
                        <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        NETWORK: STABLE
                    </div>
                </div>
            </header>

            {/* Premium Stats Grid */}
            <div className="admin-stats-grid mb-12">
                {[
                    { label: 'Network Nodes', value: stats?.userCount || 0, icon: <HiUsers />, color: 'var(--accent)' },
                    { label: 'Cloud Storage', value: stats?.postCount || 0, icon: <HiCollection />, color: '#7C3AED' },
                    { label: 'Active Signals', value: stats?.storyCount || 0, icon: <HiLightningBolt />, color: '#06B6D4' },
                    { label: 'Node Payload', value: stats?.bandwidthUsage || '4.2 TB', icon: <HiChartBar />, color: '#30D158' },
                ].map(s => (
                    <motion.div key={s.label} className="glass-card admin-stat-card border-none" whileHover={{ scale: 1.02, y: -4 }}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 rounded-xl bg-surface border border-border" style={{ color: s.color }}>
                                {s.icon}
                            </div>
                            <span className="text-[10px] font-black opacity-30 tracking-widest uppercase">Live Metrics</span>
                        </div>
                        <span className="admin-stat-label">{s.label}</span>
                        <span className="admin-stat-value mt-1">{s.value}</span>
                    </motion.div>
                ))}
            </div>

            {/* Pro Navigation Tabs */}
            <nav className="creative-tabs mb-8 no-scrollbar overflow-x-auto">
                {[
                    { id: 'overview', label: 'Overview', icon: <HiLightningBolt /> },
                    { id: 'users', label: 'User Registry', icon: <HiUsers /> },
                    { id: 'content', label: 'Content Audit', icon: <HiCollection /> },
                    { id: 'feedback', label: 'Support Queue', icon: <HiInbox /> }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        className={`creative-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </nav>

            <div className="admin-tab-content min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div key="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-8" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <div className="glass-card p-8 rounded-3xl">
                                <h3 className="t-title mb-6 flex items-center gap-2"><HiInbox className="text-accent"/> Recent Intelligence</h3>
                                <div className="flex flex-col gap-4">
                                    {feedback.slice(0, 4).map(f => (
                                        <div key={f._id} className="p-4 bg-surface/50 border border-border rounded-2xl flex justify-between items-center group hover:border-accent/40 transition-all cursor-pointer">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[14px]">Report: {f.type}</span>
                                                <span className="t-small line-clamp-1">{f.content}</span>
                                            </div>
                                            <HiArrowRight className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-accent" />
                                        </div>
                                    ))}
                                    {feedback.length === 0 && <p className="t-small text-center py-10 opacity-50">No pending reports in buffer.</p>}
                                </div>
                            </div>
                            <div className="glass-card p-8 rounded-3xl">
                                <h3 className="t-title mb-6 flex items-center gap-2"><HiUsers className="text-purple-400"/> Security Audit</h3>
                                <div className="flex flex-col gap-4">
                                    {users.slice(0, 5).map(u => (
                                        <div key={u._id} className="flex items-center justify-between p-3 border-b border-border/10 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`} className="w-8 h-8 rounded-full border border-border" alt="" />
                                                <span className="text-[13px] font-medium">@{u.username}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.isVerified ? 'bg-accent/10 text-accent' : 'bg-surface text-text-3'}`}>
                                                {u.isVerified ? 'Secure' : 'Unverified'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <input 
                                    className="input max-w-md" 
                                    placeholder="Execute search by network ID / username / email..." 
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                        fetchUsers(e.target.value)
                                    }}
                                />
                            </div>
                            <div className="admin-table-container glass-card border-none rounded-3xl overflow-hidden">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Subject Information</th>
                                            <th>Auth Status</th>
                                            <th>Permissions</th>
                                            <th className="text-right">Governance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u._id} className="hover:bg-accent/[0.02] transition-all">
                                                <td>
                                                    <div className="admin-user-cell py-1">
                                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=4F7AFF&color=fff`} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-border/20" alt="" />
                                                        <div className="flex-col">
                                                            <span className="font-bold text-text-1 text-[15px]">@{u.username}</span>
                                                            <span className="text-[11px] text-text-3 font-medium uppercase tracking-tighter">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {u.isVerified ? (
                                                        <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-lg font-bold text-[11px] border border-accent/20 flex items-center w-fit gap-1.5">
                                                            <HiCheckCircle size={14} /> SECURE
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-surface text-text-3 rounded-lg font-bold text-[11px] border border-border flex items-center w-fit gap-1.5">
                                                           UNVERIFIED
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`text-[11px] font-black ${u.role === 'admin' ? 'text-accent' : 'text-text-2'} uppercase tracking-widest`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            className="admin-action-btn"
                                                            title={u.isVerified ? 'Revoke Auth' : 'Approve Auth'}
                                                            onClick={() => handleToggleVerify(u._id)}>
                                                            <HiBadgeCheck size={18} />
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <button 
                                                                className="admin-action-btn admin-action-btn--danger"
                                                                title="Purge Node"
                                                                onClick={() => handleDeleteUser(u._id)}>
                                                                <HiTrash size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'content' && (
                        <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex gap-4 mb-6">
                                <button className={`btn btn-sm ${contentType === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setContentType('all'); fetchPosts('all'); }}>All Stream</button>
                                <button className={`btn btn-sm ${contentType === 'image' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setContentType('image'); fetchPosts('image'); }}>Images</button>
                                <button className={`btn btn-sm ${contentType === 'video' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setContentType('video'); fetchPosts('video'); }}>Signals (Video)</button>
                            </div>
                            <div className="admin-table-container glass-card border-none rounded-3xl overflow-hidden">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Source Origin</th>
                                            <th>Payload Details</th>
                                            <th>Type</th>
                                            <th className="text-right">Redaction</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.map(p => (
                                            <tr key={p._id} className="hover:bg-accent/[0.02]">
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}`} className="w-8 h-8 rounded-full border border-border" alt="" />
                                                        <span className="font-bold text-[14px]">@{p.author?.username}</span>
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: 400 }}>
                                                    <p className="line-clamp-1 text-text-2 font-medium" style={{ fontSize: 13 }}>{p.caption || 'STUB_CONTENT_NULL'}</p>
                                                    <div className="flex items-center gap-4 mt-1.5 opacity-50">
                                                        <span className="text-[10px] font-bold">SHA: {p._id.slice(-8)}</span>
                                                        <span className="text-[10px] uppercase">{new Date(p.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase text-text-3">
                                                        {p.mediaType === 'video' ? <HiVideoCamera className="text-purple-500" /> : <HiPhotograph className="text-accent" />}
                                                        {p.mediaType || 'RAW'}
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <button className="p-2.5 rounded-xl bg-error/5 text-error hover:bg-error/20 transition-all border border-error/10" onClick={() => handleDeletePost(p._id)}>
                                                        <HiTrash size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {posts.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-20 text-text-3 font-medium italic">No content detected in local node buffer.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'feedback' && (
                        <motion.div key="feedback" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            {feedback.map(f => (
                                <motion.div key={f._id} className="glass-card p-6 rounded-3xl border border-border/40 hover:border-accent/40 group transition-all" whileHover={{ y: -5 }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${
                                            f.type === 'bug' ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent'
                                        }`}>
                                            LOG_TYPE: {f.type}
                                        </span>
                                        <span className="text-[10px] font-bold text-text-3">{new Date(f.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[14px] font-medium text-text-1 leading-relaxed mb-6">{f.content}</p>
                                    <div className="flex items-center justify-between border-t border-border/10 pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                                {f.userId?.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="text-[12px] font-bold">@{f.userId?.username || 'ANON'}</span>
                                        </div>
                                        <button className="text-text-3 opacity-0 group-hover:opacity-100 hover:text-accent transition-all">
                                            <HiChevronRight size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {feedback.length === 0 && (
                                <div className="col-span-full py-32 text-center text-text-3 font-medium bg-surface/20 rounded-3xl border-2 border-dashed border-border/40">
                                    Buffers are clean. No pending user intelligence.
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
