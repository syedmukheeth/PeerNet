import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiChartBar, HiTrash, 
    HiBadgeCheck, HiRefresh, HiCheckCircle, HiInbox,
    HiLightningBolt, HiShieldCheck, HiArrowRight,
    HiPhotograph, HiVideoCamera, HiChevronRight, HiExclamation, HiX
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

    // Modal State
    const [showPurgeModal, setShowPurgeModal] = useState(false)
    const [userToPurge, setUserToPurge] = useState(null)

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

    const confirmPurgeUser = (userId) => {
        setUserToPurge(userId)
        setShowPurgeModal(true)
    }

    const handleDeleteUser = async () => {
        if (!userToPurge) return
        try {
            await api.delete(`/admin/users/${userToPurge}`)
            toast.success('Node purged from network')
            setShowPurgeModal(false)
            setUserToPurge(null)
            init()
        } catch {
            toast.error('Purge operation failed')
            setShowPurgeModal(false)
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
                <p className="t-small animate-pulse text-accent">Synchronizing Genesis State...</p>
            </div>
        )
    }

    return (
        <div className="admin-page fade-in pb-20 p-6 md:p-10 lg:p-12 max-w-[1400px] mx-auto min-h-screen">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 glass-card p-6 md:p-8 rounded-[32px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="t-heading flex items-center gap-4 text-3xl md:text-4xl">
                        <div className="p-3 bg-accent/20 rounded-2xl text-accent border border-accent/20">
                            <HiShieldCheck size={32} />
                        </div>
                        Infrastructure Governance
                    </h1>
                    <p className="text-text-2 mt-2 font-medium tracking-wide">Production Node Management & Global Moderation Console</p>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface/80 border border-border hover:border-accent/50 hover:bg-surface text-[14px] font-bold transition-all text-text-1" onClick={init}>
                        <HiRefresh size={18} className="text-accent"/> SYNC
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success rounded-2xl text-[12px] font-black border border-success/30 uppercase tracking-widest shadow-[0_0_20px_rgba(48,209,88,0.2)]">
                        <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(48,209,88,0.8)]" />
                        Network Stable
                    </div>
                </div>
            </header>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-14">
                {[
                    { label: 'Network Nodes', value: stats?.userCount !== undefined ? stats.userCount : '...', icon: <HiUsers />, color: '#4F7AFF', gradient: 'from-[#4F7AFF]/20 to-transparent' },
                    { label: 'Cloud Storage', value: stats?.postCount !== undefined ? stats.postCount : '...', icon: <HiCollection />, color: '#7C3AED', gradient: 'from-[#7C3AED]/20 to-transparent' },
                    { label: 'Active Signals', value: stats?.storyCount !== undefined ? stats.storyCount : '...', icon: <HiLightningBolt />, color: '#06B6D4', gradient: 'from-[#06B6D4]/20 to-transparent' },
                    { label: 'Node Payload', value: stats?.bandwidthUsage || '...', icon: <HiChartBar />, color: '#30D158', gradient: 'from-[#30D158]/20 to-transparent' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} 
                        className="glass-card p-6 md:p-8 rounded-[32px] border relative overflow-hidden group"
                        style={{ borderColor: 'var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '66'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border/60 shadow-lg text-2xl" style={{ color: s.color, boxShadow: `0 0 20px ${s.color}20` }}>
                                {s.icon}
                            </div>
                            <span className="text-[10px] font-black opacity-30 tracking-[0.2em] uppercase">Metrics</span>
                        </div>
                        <div className="relative z-10 flex flex-col">
                            <span className="text-text-3 font-semibold text-[13px] tracking-wide mb-1">{s.label}</span>
                            <span className="text-3xl md:text-5xl tracking-tighter font-black text-text-1 drop-shadow-md">{s.value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Pro Navigation Tabs */}
            <nav className="flex gap-2 p-2 bg-surface/40 backdrop-blur-md rounded-2xl w-fit mb-8 border border-border/50">
                {[
                    { id: 'overview', label: 'Dashboard', icon: <HiLightningBolt /> },
                    { id: 'users', label: 'Registry', icon: <HiUsers /> },
                    { id: 'content', label: 'Audit', icon: <HiCollection /> },
                    { id: 'feedback', label: 'Queue', icon: <HiInbox /> }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[14px] transition-all ${activeTab === tab.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-2 hover:bg-surface hover:text-text-1'}`}
                        onClick={() => setActiveTab(tab.id)}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </nav>

            <div className="min-h-[500px] w-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div key="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-8" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <div className="glass-card p-8 rounded-[32px] border border-border/50">
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-text-1"><div className="p-2 bg-accent/10 rounded-lg text-accent"><HiInbox /></div> Central Intelligence</h3>
                                <div className="flex flex-col gap-4">
                                    {feedback.slice(0, 4).map(f => (
                                        <div key={f._id} className="p-5 bg-surface/60 border border-border/60 rounded-2xl flex justify-between items-center group hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md ${f.type === 'bug' ? 'bg-error/20 text-error' : 'bg-accent/20 text-accent'}`}>{f.type}</span>
                                                    <span className="font-bold text-[15px] text-text-1">System Report</span>
                                                </div>
                                                <span className="text-[14px] text-text-3 font-medium line-clamp-1 mt-1">{f.content}</span>
                                            </div>
                                            <HiArrowRight className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-accent text-xl" />
                                        </div>
                                    ))}
                                    {feedback.length === 0 && <p className="text-center py-12 opacity-40 font-medium text-lg">No pending system reports.</p>}
                                </div>
                            </div>
                            <div className="glass-card p-8 rounded-[32px] border border-border/50">
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-text-1"><div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><HiUsers /></div> Node Security Audit</h3>
                                <div className="flex flex-col gap-5">
                                    {users.slice(0, 5).map(u => (
                                        <div key={u._id} className="flex items-center justify-between p-4 bg-surface/30 rounded-2xl border border-border/40 hover:bg-surface/80 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=202020&color=fff`} className="w-10 h-10 rounded-xl border border-border shadow-sm object-cover" alt="" />
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-text-1">@{u.username}</span>
                                                    <span className="text-[11px] font-medium text-text-3 tracking-wide">{u.email}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border ${u.isVerified ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface text-text-3 border-border'}`}>
                                                {u.isVerified ? 'Secure' : 'Unverified'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <input 
                                    className="w-full md:max-w-lg bg-surface/50 border border-border text-text-1 rounded-2xl px-6 py-4 outline-none focus:border-accent/50 focus:bg-surface transition-all font-medium placeholder-text-3" 
                                    placeholder="Execute query by Username / Node ID / Email..." 
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                        fetchUsers(e.target.value)
                                    }}
                                />
                            </div>
                            <div className="glass-card border border-border/50 rounded-[32px] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-surface/50 border-b border-border/50">
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Subject Profile</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Authentication</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Class</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {users.map(u => (
                                                <tr key={u._id} className="hover:bg-surface/30 transition-colors group">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=4F7AFF&color=fff`} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-border/50 group-hover:ring-accent/50 transition-all" alt="" />
                                                            <div className="flex flex-col">
                                                                <span className="font-extrabold text-text-1 text-[16px]">@{u.username}</span>
                                                                <span className="text-[12px] text-text-3 font-medium opacity-80">{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {u.isVerified ? (
                                                            <span className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg font-bold text-[11px] border border-accent/20 flex items-center w-fit gap-2">
                                                                <HiCheckCircle size={16} /> SECURE
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1.5 bg-surface/80 text-text-3 rounded-lg font-bold text-[11px] border border-border/80 flex items-center w-fit gap-2">
                                                               UNVERIFIED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className={`text-[11px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-surface border-border text-text-2'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <button 
                                                                className="p-2.5 rounded-xl bg-surface hover:bg-accent/10 border border-border hover:border-accent/40 text-text-2 hover:text-accent transition-all"
                                                                title={u.isVerified ? 'Revoke Auth' : 'Approve Auth'}
                                                                onClick={() => handleToggleVerify(u._id)}>
                                                                <HiBadgeCheck size={20} />
                                                            </button>
                                                            {u.role !== 'admin' && (
                                                                <button 
                                                                    className="p-2.5 rounded-xl bg-surface hover:bg-error/10 border border-border hover:border-error/40 text-text-2 hover:text-error transition-all"
                                                                    title="Purge Node"
                                                                    onClick={() => confirmPurgeUser(u._id)}>
                                                                    <HiTrash size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'content' && (
                        <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex gap-3 mb-8 bg-surface/50 p-2 border border-border/50 rounded-2xl w-fit">
                                <button className={`px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all ${contentType === 'all' ? 'bg-text-1 text-black' : 'text-text-2 hover:text-text-1'}`} onClick={() => { setContentType('all'); fetchPosts('all'); }}>Global Stream</button>
                                <button className={`px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all ${contentType === 'image' ? 'bg-text-1 text-black' : 'text-text-2 hover:text-text-1'}`} onClick={() => { setContentType('image'); fetchPosts('image'); }}>Optical (Img)</button>
                                <button className={`px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all ${contentType === 'video' ? 'bg-text-1 text-black' : 'text-text-2 hover:text-text-1'}`} onClick={() => { setContentType('video'); fetchPosts('video'); }}>Signals (Vid)</button>
                            </div>
                            <div className="glass-card border border-border/50 rounded-[32px] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-surface/50 border-b border-border/50">
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Origin Node</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Payload Data</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3">Format</th>
                                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-text-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {posts.map(p => (
                                                <tr key={p._id} className="hover:bg-surface/30 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=202020&color=fff`} className="w-10 h-10 rounded-xl border border-border/50 object-cover" alt="" />
                                                            <span className="font-bold text-[14px] text-text-1">@{p.author?.username}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4" style={{ maxWidth: 400 }}>
                                                        <p className="line-clamp-2 text-text-1 font-medium text-[14px] mb-1.5">{p.caption || <span className="italic text-text-3">Null Context</span>}</p>
                                                        <div className="flex items-center gap-4 text-text-3 opacity-60">
                                                            <span className="text-[10px] font-bold bg-surface px-2 py-0.5 rounded border border-border">SHA: {p._id.slice(-8)}</span>
                                                            <span className="text-[10px] font-bold tracking-wider">{new Date(p.createdAt).toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border w-fit ${p.mediaType === 'video' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                            {p.mediaType === 'video' ? <HiVideoCamera size={16} /> : <HiPhotograph size={16} />}
                                                            {p.mediaType || 'RAW'}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <button 
                                                            className="p-3 rounded-xl bg-surface hover:bg-error/10 border border-border hover:border-error/40 text-text-2 hover:text-error transition-all inline-flex" 
                                                            onClick={() => handleDeletePost(p._id)}
                                                            title="Redact Content">
                                                            <HiTrash size={20} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {posts.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-24 text-text-3 font-medium flex flex-col items-center justify-center gap-4 border-none">
                                                        <div className="w-16 h-16 rounded-full bg-surface/50 border border-border/30 flex items-center justify-center text-3xl">🗂️</div>
                                                        No active data payloads found in local cluster.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'feedback' && (
                        <motion.div key="feedback" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            {feedback.map(f => (
                                <motion.div key={f._id} className="glass-card p-8 rounded-[32px] border border-border/40 hover:border-accent/30 group transition-all" whileHover={{ y: -4 }}>
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border tracking-widest ${
                                            f.type === 'bug' ? 'bg-error/10 text-error border-error/20' : 'bg-accent/10 text-accent border-accent/20'
                                        }`}>
                                            SYS_{f.type}
                                        </span>
                                        <span className="text-[11px] font-bold text-text-3 px-2 py-1 bg-surface rounded-md border border-border">{new Date(f.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[15px] font-medium text-text-1 leading-relaxed mb-8">{f.content}</p>
                                    <div className="flex items-center justify-between border-t border-border/20 pt-5">
                                        <div className="flex items-center gap-3">
                                            <img src={f.userId?.avatarUrl || `https://ui-avatars.com/api/?name=${f.userId?.username}&background=202020&color=fff`} className="w-8 h-8 rounded-full border border-border/50 object-cover" alt="" />
                                            <span className="text-[13px] font-bold">@{f.userId?.username || 'ANON_NODE'}</span>
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-text-3 group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-all">
                                            <HiChevronRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {feedback.length === 0 && (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center gap-4 text-center text-text-3 font-medium bg-surface/10 rounded-[32px] border-2 border-dashed border-border/30">
                                    <div className="w-20 h-20 rounded-full bg-surface border border-border/50 flex items-center justify-center animate-pulse shadow-xl">
                                        <HiCheckCircle size={40} className="text-success" />
                                    </div>
                                    <span className="text-lg">Diagnostics Clear. Zero anomalous events pending.</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Modal for Node Purging built in Digital Obsidian style */}
            <AnimatePresence>
                {showPurgeModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowPurgeModal(false)}>
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md bg-card/95 border border-border/50 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-error via-red-500 to-error" />
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error mb-2 shadow-[0_0_20px_rgba(255,59,48,0.2)]">
                                    <HiExclamation size={28} />
                                </div>
                                <button className="p-2 bg-surface rounded-full text-text-3 hover:text-text-1 transition-colors" onClick={() => setShowPurgeModal(false)}>
                                    <HiX size={20} />
                                </button>
                            </div>
                            <h2 className="text-2xl font-extrabold text-text-1 tracking-tight mb-3">CRITICAL: Purge Node?</h2>
                            <p className="text-[15px] text-text-2 mb-8 leading-relaxed font-medium">
                                You are about to permanently eradicate this user node from the PeerNet ecosystem. This will cascade and sever all associated cloud storage, posts, and optical signals connected to it. <span className="text-error font-bold block mt-2">This action is physically irreversible.</span>
                            </p>
                            <div className="flex gap-3">
                                <button className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-bold transition-all hover:bg-surface text-text-1" onClick={() => setShowPurgeModal(false)}>
                                    ABORT
                                </button>
                                <button className="flex-1 py-3.5 rounded-xl border border-error/50 bg-error/10 text-error text-[14px] font-bold transition-all hover:bg-error hover:text-white shadow-[0_0_15px_rgba(255,59,48,0.3)] hover:shadow-[0_0_30px_rgba(255,59,48,0.5)]" onClick={handleDeleteUser}>
                                    CONFIRM PURGE
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
