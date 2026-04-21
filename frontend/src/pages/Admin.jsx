import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiTrash, 
    HiBadgeCheck, HiRefresh, HiInbox,
    HiLightningBolt, HiShieldCheck, HiArrowRight,
    HiVideoCamera, HiExclamation,
    HiKey, HiDatabase, HiGlobe, HiEye, HiSearch,
    HiLockClosed
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

// --- Custom Components ---

const AdminSidebar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'overview', label: 'Overview', icon: <HiGlobe /> },
        { id: 'users', label: 'User Directory', icon: <HiUsers /> },
        { id: 'content', label: 'Moderation', icon: <HiEye /> },
        { id: 'feedback', label: 'Feedback', icon: <HiInbox /> },
        { id: 'danger', label: 'Maintenance', icon: <HiLockClosed />, color: '#EB5757' }
    ]

    return (
        <aside className="w-full lg:w-72 flex flex-col gap-8">
            <nav className="admin-side-nav p-3">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="text-xl">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="glass-card p-8 rounded-[32px] border-border/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
                <h4 className="text-sm font-bold text-text-1 mb-2 relative z-10">Quick Support</h4>
                <p className="text-xs text-text-3 font-medium mb-4 relative z-10 leading-relaxed">Need help managing the network infrastructure?</p>
                <button className="text-[11px] font-black uppercase tracking-widest text-accent hover:underline relative z-10">Read Documentation</button>
            </div>
        </aside>
    )
}

const StatCard = ({ label, value, sub, icon, color, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay }}
        className="admin-stat-card group"
    >
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-surface-el border border-border/40 text-2xl shadow-sm text-accent group-hover:scale-110 transition-transform duration-500" style={{ color }}>
                    {icon}
                </div>
                <div className="text-right">
                    <span className="block text-[11px] font-black text-text-3 uppercase tracking-widest opacity-40">{label}</span>
                    <span className="block text-[10px] font-bold text-text-3 opacity-30 mt-1">{sub}</span>
                </div>
            </div>
            
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-4xl font-black text-text-1 tracking-tighter">{value}</h2>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live Tracking</span>
                    </div>
                </div>
                
                {/* Minimal Sparkline Visual */}
                <div className="flex items-end gap-1 h-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    {[30, 60, 45, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="w-1 bg-accent rounded-full transition-all duration-500 group-hover:bg-text-1" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        </div>
    </motion.div>
)

export default function Admin() {
    const [activeTab, setActiveTab] = useState('overview')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [contentType, setContentType] = useState('all')

    // Modal & Danger State
    const [showPurgeModal, setShowPurgeModal] = useState(false)
    const [userToPurge, setUserToPurge] = useState(null)
    const [showNukeModal, setShowNukeModal] = useState(false)
    const [nukeType, setNukeType] = useState('')
    const [nukeConfirm, setNukeConfirm] = useState('')

    const confirmDeleteUser = (userId) => {
        setUserToPurge(userId)
        setShowPurgeModal(true)
    }

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats')
            if (data.success) setStats(data.data)
        } catch {
            toast.error('Failed to load dashboard statistics')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/users?search=${q}`)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('Failed to connect to user directory')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await api.get(`/admin/posts?type=${type}`)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to load content moderation feed')
        }
    }, [])

    const fetchFeedback = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/feedback')
            if (data.success) setFeedback(data.items)
        } catch {
            toast.error('Feedback queue could not be loaded')
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

    // --- Actions ---

    const handleDeleteUser = async () => {
        if (!userToPurge) return
        try {
            await api.delete(`/admin/users/${userToPurge}`)
            toast.success('User account deleted successfully')
            setShowPurgeModal(false)
            setUserToPurge(null)
            init()
        } catch {
            toast.error('Delete operation failed')
            setShowPurgeModal(false)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Post removed from network')
            fetchPosts(contentType)
            fetchStats()
        } catch {
            toast.error('Failed to delete post')
        }
    }

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('User verification status updated')
            fetchUsers(search)
        } catch {
            toast.error('Update failed')
        }
    }

    const handleNuke = async () => {
        if (nukeConfirm !== 'PURGE_NETWORK') {
            return toast.error('Security code is incorrect')
        }
        try {
            await api.delete('/admin/infrastructure/nuke', { 
                data: { type: nukeType, confirmationCode: nukeConfirm } 
            })
            toast.success('System reset complete')
            setShowNukeModal(false)
            setNukeConfirm('')
            init()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        }
    }

    // --- Rendering ---

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <HiShieldCheck size={32} className="text-accent opacity-50" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold tracking-[0.2em] uppercase text-text-3 opacity-60">Setting up environment</p>
                    <p className="text-text-1 font-bold mt-2">Loading Admin Dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-page fade-in min-h-screen pb-32">
            
            {/* --- DASHBOARD HEADER --- */}
            <header className="mb-12 pt-8 px-6 md:px-12 text-center xl:text-left">
                <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row justify-between items-end gap-10 pb-12 border-b border-border/20">
                    <div>
                        <div className="flex items-center justify-center xl:justify-start gap-4 mb-4">
                            <div className="p-2.5 bg-accent/10 text-accent rounded-xl border border-accent/20">
                                <HiShieldCheck size={24} />
                            </div>
                            <nav className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] uppercase opacity-40">
                                <span>Platform</span>
                                <span className="opacity-30">/</span>
                                <span className="text-accent">Console</span>
                            </nav>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-text-1 tracking-tightest leading-[0.9]">Admin <span className="text-accent">Dashboard</span></h1>
                        <p className="text-text-3 mt-6 font-medium text-lg max-w-xl leading-relaxed mx-auto xl:mx-0">Advanced governance hub for PeerNet infrastructure. Monitor metrics, moderate content, and manage users in real-time.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <button onClick={init} className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-10 py-6 rounded-3xl bg-surface-el border border-border/60 hover:border-accent/40 hover:bg-surface text-[14px] font-black tracking-widest uppercase transition-all text-text-1 active:scale-95 group shadow-xl">
                            <HiRefresh size={20} className="text-accent group-hover:rotate-180 transition-transform duration-700"/> 
                            Sync Data
                        </button>
                        <div className="flex-1 xl:flex-none flex items-center justify-center gap-4 px-10 py-6 bg-surface-el rounded-3xl text-[12px] font-black border border-border/60 uppercase tracking-[0.2em] text-text-2 shadow-xl">
                            <div className="status-heartbeat" />
                            System Active
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-6 md:px-12">
                {/* --- OVERVIEW STATS --- */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    <StatCard label="Total Users" value={stats?.userCount || 0} sub="Registered members" icon={<HiUsers />} color="#4F7AFF" delay={0.1} />
                    <StatCard label="Total Posts" value={stats?.postCount || 0} sub="Shared by community" icon={<HiCollection />} color="#7C3AED" delay={0.2} />
                    <StatCard label="Daily Stories" value={stats?.storyCount || 0} sub="Recent activities" icon={<HiLightningBolt />} color="#06B6D4" delay={0.3} />
                    <StatCard label="Network Assets" value={stats?.bandwidthUsage || '0 GB'} sub="Total media weight" icon={<HiDatabase />} color="#30D158" delay={0.4} />
                </section>

                <div className="flex flex-col lg:flex-row gap-16">
                    {/* --- INNER SIDEBAR --- */}
                    <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

                    {/* --- MAIN VIEWS --- */}
                    <main className="flex-1 min-h-[700px] relative">
                        <AnimatePresence mode="wait">
                            
                            {/* DASHBOARD OVERVIEW */}
                            {activeTab === 'overview' && (
                                <motion.div key="overview" className="grid grid-cols-1 xl:grid-cols-3 gap-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                                    <div className="xl:col-span-2 glass-card p-12 rounded-[50px] border border-border/40 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><HiGlobe size={180} /></div>
                                        <div className="flex justify-between items-center mb-12 relative z-10">
                                            <h3 className="text-3xl font-black text-text-1 flex items-center gap-5 tracking-tight">
                                                <div className="p-4 bg-accent/10 rounded-2xl text-accent border border-accent/20"><HiGlobe /></div> Activity Logs
                                            </h3>
                                            <button className="text-accent font-black text-xs uppercase tracking-widest hover:underline" onClick={() => setActiveTab('feedback')}>Manage Feedback</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                            {feedback.slice(0, 4).map(f => (
                                                <div key={f._id} className="p-8 bg-surface-el/40 border border-border/40 rounded-[36px] flex flex-col gap-5 group hover:border-accent/40 hover:bg-surface transition-all duration-500 shadow-lg">
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-[10px] uppercase font-black tracking-[0.2em] px-4 py-2 rounded-xl ${f.type === 'bug' ? 'bg-error/10 text-error border border-error/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>{f.type}</span>
                                                        <span className="text-[11px] font-black text-text-3 opacity-30">{new Date(f.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[15px] text-text-1 font-bold line-clamp-2 leading-relaxed h-12 opacity-80 group-hover:opacity-100 transition-opacity">{f.content}</p>
                                                    <div className="flex items-center justify-between border-t border-border/10 pt-6 mt-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                                                            <span className="text-xs font-black text-text-3 opacity-60 tracking-tight">@{f.userId?.username || 'Guest Node'}</span>
                                                        </div>
                                                        <HiArrowRight className="text-accent opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                                                    </div>
                                                </div>
                                            ))}
                                            {feedback.length === 0 && <div className="col-span-2 text-center py-32 opacity-20 text-xs font-black uppercase tracking-[0.5em]">No Terminal Input</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="glass-card p-12 rounded-[50px] border border-border/40 shadow-2xl overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><HiUsers size={120} /></div>
                                        <h3 className="text-3xl font-black text-text-1 mb-12 flex items-center gap-5 tracking-tight relative z-10">
                                            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20"><HiUsers /></div> Active Nodes
                                        </h3>
                                        <div className="flex flex-col gap-6 relative z-10">
                                            {users.slice(0, 6).map(u => (
                                                <div key={u._id} className="flex items-center justify-between p-6 bg-surface-el/40 rounded-[32px] border border-border/40 hover:bg-surface transition-all duration-500 group shadow-lg">
                                                    <div className="flex items-center gap-5">
                                                        <div className="relative">
                                                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=202020&color=fff`} className="w-14 h-14 rounded-2xl object-cover shadow-2xl border-2 border-transparent group-hover:border-accent/40 transition-all" alt="" />
                                                            {u.isVerified && <div className="absolute -top-1.5 -right-1.5 p-1.5 bg-accent rounded-full border-4 border-surface shadow-xl"><HiBadgeCheck className="text-white text-[12px]"/></div>}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[17px] font-black text-text-1 tracking-tight">@{u.username}</span>
                                                            <span className="text-[10px] font-black text-accent uppercase tracking-[0.15em] mt-1 opacity-60 group-hover:opacity-100 transition-opacity">{u.role}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-surface border border-border/40 text-text-3 opacity-30 group-hover:opacity-100 group-hover:text-accent group-hover:border-accent/40 transition-all shadow-md">
                                                        <HiShieldCheck size={20} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* USER DIRECTORY */}
                            {activeTab === 'users' && (
                                <motion.div key="users" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <div className="flex flex-col md:flex-row justify-between items-stretch gap-8 mb-16">
                                        <div className="relative flex-1 group">
                                            <HiSearch className="absolute left-8 top-1/2 -translate-y-1/2 text-text-3 text-2xl opacity-20 group-focus-within:opacity-100 group-focus-within:text-accent transition-all" />
                                            <input 
                                                className="w-full bg-surface-el/50 border border-border/80 text-text-1 rounded-[35px] pl-20 pr-10 py-7 outline-none focus:border-accent/60 focus:bg-surface focus:shadow-2xl focus:shadow-accent/5 transition-all font-black placeholder-text-3 tracking-wide text-xl shadow-lg" 
                                                placeholder="Query global identity ledger..." 
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value)
                                                    fetchUsers(e.target.value)
                                                }}
                                            />
                                        </div>
                                        <button onClick={() => fetchUsers(search)} className="px-16 py-7 bg-accent text-white rounded-[35px] font-black text-sm tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-95 shadow-2xl shadow-accent/20">Init Query</button>
                                    </div>
                                    
                                    <div className="glass-card border border-border/40 rounded-[60px] overflow-hidden shadow-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-surface-el border-b border-border/40">
                                                    <th className="px-14 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-text-3 opacity-50">Node Identity</th>
                                                    <th className="px-14 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-text-3 opacity-50">Auth Status</th>
                                                    <th className="px-14 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-text-3 opacity-50">Privilege Tier</th>
                                                    <th className="px-14 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-text-3 opacity-50 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/10">
                                                {users.map(u => (
                                                    <tr key={u._id} className="hover:bg-surface/60 transition-all duration-500 group relative">
                                                        <td className="px-14 py-8">
                                                            <div className="flex items-center gap-7">
                                                                <div className="relative">
                                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=4F7AFF&color=fff`} className="w-16 h-16 rounded-[24px] object-cover shadow-2xl group-hover:scale-110 transition-transform duration-700 border-2 border-transparent group-hover:border-accent/40" alt="" />
                                                                    <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-success border-4 border-surface rounded-full shadow-2xl" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-text-1 text-2xl tracking-tightest">@{u.username}</span>
                                                                    <span className="text-xs text-text-3 font-bold opacity-30 mt-1 lowercase tracking-tight">{u.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-14 py-8">
                                                            {u.isVerified ? (
                                                                <span className="inline-flex items-center gap-3 px-6 py-3 bg-success/10 text-success rounded-2xl font-black text-[10px] border border-success/20 tracking-[0.2em] shadow-xl shadow-success/5">
                                                                    <HiBadgeCheck size={18} /> VERIFIED
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-3 px-6 py-3 bg-surface-el text-text-3 rounded-2xl font-black text-[10px] border border-border tracking-[0.2em] opacity-20 group-hover:opacity-50 transition-opacity">
                                                                    PENDING
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-14 py-8">
                                                            <span className={`text-[10px] font-black tracking-[0.25em] uppercase px-6 py-3 rounded-2xl border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-xl shadow-purple-500/5' : 'bg-surface border-border text-text-2 group-hover:border-accent/40 transition-all shadow-sm'}`}>
                                                                {u.role === 'admin' ? 'Super Admin' : 'Node User'}
                                                            </span>
                                                        </td>
                                                        <td className="px-14 py-8 text-right">
                                                            <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-8 group-hover:translate-x-0 duration-700">
                                                                <button onClick={() => handleToggleVerify(u._id)} title="Grant Verification" className="p-5 rounded-[22px] bg-surface-el border border-border hover:bg-accent hover:border-accent hover:text-white transition-all shadow-xl active:scale-90 text-accent group-hover:text-inherit">
                                                                    <HiKey size={22} />
                                                                </button>
                                                                {u.role !== 'admin' && (
                                                                    <button onClick={() => confirmDeleteUser(u._id)} title="Purge Node" className="p-5 rounded-[22px] bg-surface-el border border-border hover:bg-error hover:border-error hover:text-white transition-all shadow-xl active:scale-90 text-error group-hover:text-inherit">
                                                                        <HiTrash size={22} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {users.length === 0 && <div className="text-center py-40 opacity-10 text-4xl font-black uppercase tracking-[1em]">Ledger Empty</div>}
                                    </div>
                                </motion.div>
                            )}

                            {/* MODERATION FEED */}
                            {activeTab === 'content' && (
                                <motion.div key="content" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div className="flex flex-wrap gap-4 mb-16">
                                        {['all', 'image', 'video'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => { setContentType(t); fetchPosts(t); }}
                                                className={`px-12 py-6 rounded-[28px] font-black text-[11px] tracking-[0.3em] uppercase transition-all border-2 ${contentType === t ? 'bg-accent text-white border-accent shadow-[0_20px_50px_rgba(124,58,237,0.3)]' : 'bg-surface-el/60 text-text-3 border-border/40 hover:border-accent/40 hover:text-text-1 hover:shadow-2xl'}`}
                                            >
                                                {t === 'all' ? 'Universal Assets' : t + 's Only'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                                        {posts.map(p => (
                                            <div key={p._id} className="glass-card rounded-[60px] border border-border/40 overflow-hidden group hover:border-accent/40 transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(124,58,237,0.1)]">
                                                <div className="aspect-[4/5] relative overflow-hidden bg-black">
                                                    {p.mediaType === 'video' ? (
                                                        <video src={p.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out" />
                                                    ) : (
                                                        <img src={p.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out" alt="" />
                                                    )}
                                                    
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-700" />
                                                    
                                                    <div className="absolute top-10 right-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-all translate-y-10 group-hover:translate-y-0 duration-700">
                                                        <button onClick={() => handleDeletePost(p._id)} className="p-5 bg-error text-white rounded-[24px] shadow-2xl border border-error/30 hover:scale-115 active:scale-90 transition-all hover:brightness-110" title="Synchronous Purge">
                                                            <HiTrash size={26} />
                                                        </button>
                                                    </div>
                                                    
                                                    {p.mediaType === 'video' && (
                                                        <div className="absolute bottom-10 left-10 p-4 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white shadow-2xl group-hover:border-accent/40 transition-colors">
                                                            <HiVideoCamera size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-12 relative">
                                                    <div className="flex items-center gap-6 mb-8">
                                                        <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=202020&color=fff`} className="w-14 h-14 rounded-[22px] border-4 border-surface shadow-2xl group-hover:border-accent/20 transition-all duration-700" alt="" />
                                                        <div className="flex flex-col">
                                                            <span className="text-lg font-black text-text-1 tracking-tight">@{p.author?.username}</span>
                                                            <span className="text-[11px] font-black text-text-3 uppercase tracking-[0.2em] opacity-30 mt-1">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[16px] text-text-2 font-bold line-clamp-3 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity duration-500 italic">&ldquo;{p.caption || 'No metadata description available for this fragment.'}&rdquo;</p>
                                                </div>
                                            </div>
                                        ))}
                                        {posts.length === 0 && <div className="col-span-full text-center py-64 opacity-5 text-5xl font-black uppercase tracking-[1em]">No Fragments</div>}
                                    </div>
                                </motion.div>
                            )}

                            {/* MAINTENANCE & DANGER ZONE */}
                            {activeTab === 'danger' && (
                                <motion.div key="danger" className="max-w-5xl mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div className="glass-card p-20 rounded-[80px] border-2 border-error/20 bg-error/[0.015] relative overflow-hidden shadow-[0_50px_100px_rgba(239,68,68,0.1)]">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-error/30 to-transparent" />
                                        
                                        <div className="flex flex-col items-center text-center mb-24">
                                            <div className="w-28 h-28 rounded-[45px] bg-error/10 border border-error/20 flex items-center justify-center text-error mb-12 shadow-2xl shadow-error/10 animate-pulse">
                                                <HiExclamation size={64} />
                                            </div>
                                            <h2 className="text-6xl md:text-7xl font-black text-text-1 tracking-tightest mb-8 uppercase leading-[0.9]">Nuclear <span className="text-error">Protocol</span></h2>
                                            <p className="text-text-3 font-bold text-2xl max-w-2xl leading-relaxed opacity-40">Irreversible infrastructure modification area. These commands will permanently decouple data assets from the PeerNet core hardware.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="p-14 bg-surface-el/40 border border-border/80 rounded-[60px] hover:border-error/40 transition-all duration-700 group relative overflow-hidden shadow-2xl">
                                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-1000 group-hover:scale-125"><HiUsers size={120} /></div>
                                                <h4 className="text-3xl font-black text-text-1 mb-6 flex items-center gap-4 tracking-tighter">Decommission Nodes</h4>
                                                <p className="text-text-3 font-bold mb-14 text-lg leading-relaxed opacity-40">Instantly terminate all standard user nodes and erase associated profile metadata from the network ledger.</p>
                                                <button 
                                                    onClick={() => { setNukeType('users'); setShowNukeModal(true); }}
                                                    className="w-full py-7 rounded-[32px] border-2 border-error/40 text-error font-black text-[12px] tracking-[0.4em] uppercase hover:bg-error hover:text-white transition-all shadow-2xl shadow-error/5 active:scale-95 group-hover:shadow-error/10">
                                                    Execute Node Purge
                                                </button>
                                            </div>
                                            <div className="p-14 bg-surface-el/40 border border-border/80 rounded-[60px] hover:border-error/40 transition-all duration-700 group relative overflow-hidden shadow-2xl">
                                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-1000 group-hover:scale-125"><HiCollection size={120} /></div>
                                                <h4 className="text-3xl font-black text-text-1 mb-6 flex items-center gap-4 tracking-tighter">Erase Fragments</h4>
                                                <p className="text-text-3 font-bold mb-14 text-lg leading-relaxed opacity-40">Synchronously incinerate every post, story, and fragment currently hosted across the global infrastructure.</p>
                                                <button 
                                                    onClick={() => { setNukeType('content'); setShowNukeModal(true); }}
                                                    className="w-full py-7 rounded-[32px] border-2 border-error/40 text-error font-black text-[12px] tracking-[0.4em] uppercase hover:bg-error hover:text-white transition-all shadow-2xl shadow-error/5 active:scale-95 group-hover:shadow-error/10">
                                                    Execute Media Wipe
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-16 p-16 bg-surface-el/60 border border-error/20 rounded-[70px] relative group overflow-hidden shadow-2xl">
                                            <div className="absolute inset-0 bg-error/5 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
                                            <div className="flex flex-col xl:flex-row justify-between items-center gap-16 relative z-10 text-center xl:text-left">
                                                <div className="flex-1">
                                                    <h4 className="text-4xl font-black text-text-1 mb-6 tracking-tightest uppercase leading-[1.1]">Genesis System Reset</h4>
                                                    <p className="text-text-3 font-bold text-xl leading-relaxed opacity-40 max-w-lg">Complete restoration to primary boot sequence. Only the Root Super Admin key will remain operational.</p>
                                                </div>
                                                <button 
                                                    onClick={() => { setNukeType('full'); setShowNukeModal(true); }}
                                                    className="w-full xl:w-auto px-20 py-8 bg-error text-white font-black text-sm tracking-[0.5em] rounded-[36px] hover:brightness-110 hover:shadow-[0_0_80px_rgba(239,68,68,0.5)] transition-all active:scale-95 shadow-2xl group-hover:scale-105">
                                                    SYSTEM NUKE
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </main>
                </div>
            </div>

            {/* --- SYSTEM MODALS --- */}
            
            <AnimatePresence>
                {/* Delete User Modal */}
                {showPurgeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl" onClick={() => setShowPurgeModal(false)}>
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl glass-card p-16 rounded-[70px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative border border-border/80 text-center">
                            <div className="w-20 h-20 bg-error/10 text-error rounded-3xl flex items-center justify-center mx-auto mb-10 border border-error/20"><HiTrash size={40} /></div>
                            <h2 className="text-5xl font-black text-text-1 tracking-tightest mb-6 uppercase">Sever Node?</h2>
                            <p className="text-text-3 font-bold text-xl mb-12 leading-relaxed opacity-60">This will permanently decouple the identity node and all associated fragments from PeerNet. This action is terminal.</p>
                            <div className="flex flex-col md:flex-row gap-6">
                                <button className="flex-1 py-6 rounded-3xl border-2 border-border font-black tracking-widest text-text-2 hover:bg-surface-el transition-all uppercase text-sm" onClick={() => setShowPurgeModal(false)}>Abort</button>
                                <button className="flex-1 py-6 rounded-3xl bg-error text-white font-black tracking-widest transition-all hover:scale-105 active:scale-95 uppercase text-sm shadow-2xl shadow-error/20" onClick={handleDeleteUser}>Confirm Purge</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* System Nuke Modal */}
                {showNukeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-error/10 backdrop-blur-[60px]" onClick={() => setShowNukeModal(false)}>
                        <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-3xl bg-surface-el border-2 border-error/30 p-20 rounded-[90px] shadow-[0_60px_120px_rgba(0,0,0,0.9)] relative text-center">
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 bg-error/20 text-error rounded-[40px] flex items-center justify-center mb-12 border-2 border-error/40 animate-pulse"><HiExclamation size={54} /></div>
                                <h3 className="text-6xl font-black text-text-1 tracking-tightest mb-8 uppercase">Genesis Protocol</h3>
                                <p className="text-error font-black mb-14 tracking-widest leading-relaxed text-xl uppercase opacity-80">WARNING: Permanent erasure of {nukeType} fragments is imminent. Proceed with extreme caution.</p>
                                
                                <div className="w-full mb-16">
                                    <label className="block text-text-3 font-black text-xs uppercase mb-6 tracking-[0.3em] opacity-40">Authentication String: &quot;PURGE_NETWORK&quot;</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface border-4 border-border/80 text-center text-4xl font-black p-8 rounded-[40px] outline-none focus:border-error transition-all tracking-[0.4em] uppercase text-error shadow-2xl"
                                        placeholder="Confirm..."
                                        value={nukeConfirm}
                                        onChange={e => setNukeConfirm(e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 w-full">
                                    <button className="flex-1 py-7 rounded-[35px] border-2 border-border text-text-1 font-black tracking-[0.3em] uppercase hover:bg-surface transition-all text-sm" onClick={() => setShowNukeModal(false)}>Abort Sequence</button>
                                    <button 
                                        onClick={handleNuke}
                                        disabled={nukeConfirm !== 'PURGE_NETWORK'}
                                        className="flex-1 py-7 rounded-[35px] bg-error text-white font-black tracking-[0.4em] disabled:opacity-10 transition-all hover:scale-105 active:scale-95 uppercase text-sm shadow-[0_20px_50px_rgba(239,68,68,0.3)]">
                                        Execute Purge
                                    </button>
                                </div>
                              </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
