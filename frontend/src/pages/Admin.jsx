import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiChartBar, HiTrash, 
    HiBadgeCheck, HiRefresh, HiInbox,
    HiLightningBolt, HiShieldCheck, HiArrowRight,
    HiVideoCamera, HiExclamation,
    HiKey, HiDatabase, HiGlobe, HiEye, HiSearch
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

    // Modal & Danger State
    const [showPurgeModal, setShowPurgeModal] = useState(false)
    const [userToPurge, setUserToPurge] = useState(null)
    const [showNukeModal, setShowNukeModal] = useState(false)
    const [nukeType, setNukeType] = useState('')
    const [nukeConfirm, setNukeConfirm] = useState('')

    const confirmPurgeUser = (userId) => {
        setUserToPurge(userId)
        setShowPurgeModal(true)
    }

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats')
            if (data.success) setStats(data.data)
        } catch {
            toast.error('G-Link: Stats Sync Failure')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/users?search=${q}`)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('G-Link: Registry Link Dropped')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await api.get(`/admin/posts?type=${type}`)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('G-Link: Audit Stream Interrupted')
        }
    }, [])

    const fetchFeedback = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/feedback')
            if (data.success) setFeedback(data.items)
        } catch {
            toast.error('G-Link: Intelligence Queue Empty')
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
            toast.success('Node Eradicated')
            setShowPurgeModal(false)
            setUserToPurge(null)
            init()
        } catch {
            toast.error('Purge Sequence Failed')
            setShowPurgeModal(false)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Core Content Redacted')
            fetchPosts(contentType)
            fetchStats()
        } catch {
            toast.error('Redaction Failed')
        }
    }

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('Identity Anchor Updated')
            fetchUsers(search)
        } catch {
            toast.error('G-Link Update Failed')
        }
    }

    const handleNuke = async () => {
        if (nukeConfirm !== 'PURGE_NETWORK') {
            return toast.error('Security Code Invalid')
        }
        try {
            await api.delete('/admin/infrastructure/nuke', { 
                data: { type: nukeType, confirmationCode: nukeConfirm } 
            })
            toast.success('INFRASTRUCTURE PURGE COMPLETE')
            setShowNukeModal(false)
            setNukeConfirm('')
            init()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Purge Sequence Failed')
        }
    }

    // --- Rendering ---

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <HiShieldCheck size={32} className="text-accent animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xl font-black tracking-[0.3em] uppercase text-text-1">Initializing</p>
                    <p className="text-accent font-bold mt-2 animate-pulse">Synchronizing Infrastructure Governance...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-page fade-in pb-20 p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto overflow-hidden">
            
            {/* --- GOVERNANCE HEADER --- */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 glass-card p-8 rounded-[40px] border border-border/40 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px] group-hover:bg-accent/20 transition-all duration-1000" />
                
                <div className="relative z-10 flex items-center gap-6">
                    <div className="p-5 bg-accent rounded-3xl text-white shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]">
                        <HiShieldCheck size={40} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-accent/20 text-accent rounded-lg text-[10px] font-black tracking-[0.2em] uppercase border border-accent/20">Alpha Node</span>
                            <span className="text-text-3 font-bold text-xs tracking-widest uppercase opacity-40">System v4.2.0</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-1 tracking-tight mt-1">Infrastructure Governance</h1>
                        <p className="text-text-2 mt-2 font-medium max-w-lg leading-relaxed">Centralized command for global node orchestration, media surveillance, and protocol maintenance.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10 w-full xl:w-auto">
                    <button onClick={init} className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-surface/80 border border-border hover:border-accent/50 hover:bg-surface text-[14px] font-black transition-all text-text-1 group active:scale-95">
                        <HiRefresh size={20} className="text-accent group-hover:rotate-180 transition-transform duration-500"/> 
                        SYNC CORE
                    </button>
                    <div className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-success/5 text-success rounded-2xl text-[12px] font-black border border-success/20 uppercase tracking-widest">
                        <span className="w-3 h-3 bg-success rounded-full animate-ping" />
                        Network Stable
                    </div>
                </div>
            </header>

            {/* --- METRICS GRID --- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {[
                    { label: 'Active Nodes', value: stats?.userCount || 0, icon: <HiUsers />, color: '#4F7AFF', sub: 'Global Registry' },
                    { label: 'Cloud Buffer', value: stats?.postCount || 0, icon: <HiCollection />, color: '#7C3AED', sub: 'Non-Video Payloads' },
                    { label: 'Pulse Signals', value: stats?.storyCount || 0, icon: <HiLightningBolt />, color: '#06B6D4', sub: '24h Broadcasts' },
                    { label: 'Total Payload', value: stats?.bandwidthUsage || '0 GB', icon: <HiChartBar />, color: '#30D158', sub: 'Bandwidth Index' }
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass-card p-8 rounded-[40px] border border-border/40 hover:border-accent/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="text-8xl font-black text-white pointer-events-none select-none">0{i+1}</span>
                        </div>
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-4 rounded-[22px] bg-surface border border-border/60 shadow-xl text-3xl transition-transform group-hover:scale-110 duration-500" style={{ color: s.color }}>
                                {s.icon}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-text-3 uppercase tracking-[0.2em]">{s.label}</span>
                                <span className="text-[11px] font-bold text-text-3 opacity-50 mt-0.5">{s.sub}</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-text-1 tracking-tighter drop-shadow-sm">{s.value}</span>
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* --- NAVIGATION TABS --- */}
            <nav className="flex flex-wrap gap-2 p-3 bg-surface/30 backdrop-blur-xl rounded-[30px] border border-border/40 w-fit mb-12">
                {[
                    { id: 'overview', label: 'Dashboard', icon: <HiGlobe /> },
                    { id: 'users', label: 'Registry', icon: <HiUsers /> },
                    { id: 'content', label: 'Audit', icon: <HiEye /> },
                    { id: 'feedback', label: 'Intelligence', icon: <HiInbox /> },
                    { id: 'danger', label: 'Danger Zone', icon: <HiExclamation />, color: 'var(--error)' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        className={`flex items-center gap-3 px-8 py-4 rounded-[22px] font-black text-[13px] uppercase tracking-wider transition-all relative ${activeTab === tab.id ? 'bg-accent text-white shadow-[0_0_25px_rgba(var(--accent-rgb),0.3)]' : 'text-text-2 hover:bg-surface hover:text-text-1'}`}
                        style={activeTab === tab.id && tab.color ? { background: tab.color } : {}}
                        onClick={() => setActiveTab(tab.id)}>
                        {tab.icon} {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTabGlow" className="absolute inset-0 bg-white/10 rounded-[22px] blur-md -z-10" />
                        )}
                    </button>
                ))}
            </nav>

            {/* --- DYNAMIC VIEWS --- */}
            <main className="min-h-[600px] relative">
                <AnimatePresence mode="wait">
                    
                    {/* DASHBOARD OVERVIEW */}
                    {activeTab === 'overview' && (
                        <motion.div key="overview" className="grid grid-cols-1 xl:grid-cols-3 gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <div className="xl:col-span-2 glass-card p-10 rounded-[40px] border border-border/40">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-black text-text-1 flex items-center gap-4">
                                        <div className="p-3 bg-accent/10 rounded-2xl text-accent"><HiGlobe /></div> Global Surveillance
                                    </h3>
                                    <button className="text-accent font-black text-xs tracking-widest uppercase hover:underline" onClick={() => setActiveTab('feedback')}>View Intelligence Queue</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {feedback.slice(0, 4).map(f => (
                                        <div key={f._id} className="p-6 bg-surface/40 border border-border/60 rounded-3xl flex flex-col gap-4 group hover:border-accent/40 transition-all">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-xl ${f.type === 'bug' ? 'bg-error/10 text-error border border-error/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>{f.type}</span>
                                                <span className="text-[11px] font-bold text-text-3 opacity-50">{new Date(f.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[15px] text-text-1 font-semibold line-clamp-2 leading-relaxed h-12">{f.content}</p>
                                            <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-2">
                                                <span className="text-xs font-bold text-text-3">Reported by @{f.userId?.username || 'ANON'}</span>
                                                <HiArrowRight className="text-accent opacity-0 group-hover:opacity-100 transition-all font-black" />
                                            </div>
                                        </div>
                                    ))}
                                    {feedback.length === 0 && <div className="col-span-2 text-center py-20 opacity-30 text-lg font-bold uppercase tracking-[0.3em]">All Signals Clear</div>}
                                </div>
                            </div>
                            
                            <div className="glass-card p-10 rounded-[40px] border border-border/40">
                                <h3 className="text-2xl font-black text-text-1 mb-10 flex items-center gap-4">
                                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><HiUsers /></div> Guard Registry
                                </h3>
                                <div className="flex flex-col gap-5">
                                    {users.slice(0, 6).map(u => (
                                        <div key={u._id} className="flex items-center justify-between p-5 bg-surface/30 rounded-3xl border border-border/40 hover:bg-surface/80 hover:border-accent/30 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=202020&color=fff`} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                                                    {u.isVerified && <div className="absolute -bottom-1 -right-1 p-1 bg-accent rounded-full border-2 border-surface"><HiBadgeCheck className="text-white text-xs"/></div>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-black text-text-1">@{u.username}</span>
                                                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-tighter opacity-50">{u.role} NODE</span>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-xl bg-surface border ${u.isVerified ? 'border-accent/40 text-accent' : 'border-border text-text-3 opacity-30'}`}>
                                                <HiShieldCheck size={18} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* REGISTRY (USER MANAGEMENT) */}
                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 mb-10">
                                <div className="relative flex-1">
                                    <HiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-text-3 text-xl" />
                                    <input 
                                        className="w-full bg-surface/50 border border-border/60 text-text-1 rounded-[25px] pl-16 pr-8 py-5 outline-none focus:border-accent/80 focus:bg-surface transition-all font-black placeholder-text-3 tracking-wide" 
                                        placeholder="SEARCH GLOBAL REGISTRY (USERNAME / NODE_ID / EMAIL)" 
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value)
                                            fetchUsers(e.target.value)
                                        }}
                                    />
                                </div>
                                <button onClick={() => fetchUsers(search)} className="px-10 py-5 bg-accent text-white rounded-[25px] font-black text-sm tracking-widest hover:scale-105 transition-all">RE-INDEX</button>
                            </div>
                            
                            <div className="glass-card border border-border/40 rounded-[40px] overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface/60 border-b border-border/40">
                                            <th className="px-10 py-7 text-[11px] font-black uppercase tracking-[0.2em] text-text-3">Node Identity</th>
                                            <th className="px-10 py-7 text-[11px] font-black uppercase tracking-[0.2em] text-text-3">Protocol Status</th>
                                            <th className="px-10 py-7 text-[11px] font-black uppercase tracking-[0.2em] text-text-3">Clearance</th>
                                            <th className="px-10 py-7 text-[11px] font-black uppercase tracking-[0.2em] text-text-3 text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {users.map(u => (
                                            <tr key={u._id} className="hover:bg-accent/5 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=4F7AFF&color=fff`} className="w-14 h-14 rounded-3xl object-cover shadow-2xl group-hover:scale-110 transition-transform" alt="" />
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-text-1 text-lg tracking-tight">@{u.username}</span>
                                                            <span className="text-xs text-text-3 font-bold opacity-60 lowercase">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    {u.isVerified ? (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-2xl font-black text-[10px] border border-success/20 tracking-widest">
                                                            <HiBadgeCheck size={18} /> VERIFIED_ORIGIN
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface text-text-3 rounded-2xl font-black text-[10px] border border-border tracking-widest opacity-40">
                                                            UNSECURED_NODE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className={`text-[11px] font-black tracking-[0.15em] uppercase px-4 py-2 rounded-2xl border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-surface border-border text-text-2'}`}>
                                                        SEC_{u.role}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleToggleVerify(u._id)} title="Update Identity Bridge" className="p-3.5 rounded-2xl bg-surface hover:bg-accent text-text-2 hover:text-white border border-border hover:border-accent transition-all">
                                                            <HiKey size={22} />
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <button onClick={() => confirmPurgeUser(u._id)} title="Eradicate Node" className="p-3.5 rounded-2xl bg-surface hover:bg-error text-text-2 hover:text-white border border-border hover:border-error transition-all">
                                                                <HiTrash size={22} />
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


                    {/* AUDIT (CONTENT MANAGEMENT) */}
                    {activeTab === 'content' && (
                        <motion.div key="content" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="flex flex-wrap gap-4 mb-10">
                                {['all', 'image', 'video'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => { setContentType(t); fetchPosts(t); }}
                                        className={`px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all ${contentType === t ? 'bg-accent text-white' : 'bg-surface/50 text-text-3 border border-border/40 hover:border-accent/40'}`}
                                    >
                                        {t}_payloads
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {posts.map(p => (
                                    <div key={p._id} className="glass-card rounded-[40px] border border-border/40 overflow-hidden group hover:border-accent/40 transition-all">
                                        <div className="aspect-square relative overflow-hidden bg-black">
                                            {p.mediaType === 'video' ? (
                                                <video src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <img src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                            )}
                                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                <button onClick={() => handleDeletePost(p._id)} className="p-3 bg-error text-white rounded-xl shadow-xl hover:brightness-110 active:scale-90 transition-all">
                                                    <HiTrash size={20} />
                                                </button>
                                            </div>
                                            {p.mediaType === 'video' && (
                                                <div className="absolute bottom-6 left-6 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                                    <HiVideoCamera className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8">
                                            <div className="flex items-center gap-4 mb-4">
                                                <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=202020&color=fff`} className="w-10 h-10 rounded-xl" alt="" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-text-1">@{p.author?.username}</span>
                                                    <span className="text-[10px] font-bold text-text-3 uppercase">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-text-2 font-medium line-clamp-2 leading-relaxed italic">&ldquo;{p.caption || 'NO_CAPTION_SIGNAL'}&rdquo;</p>
                                        </div>
                                    </div>
                                ))}
                                {posts.length === 0 && <div className="col-span-full text-center py-40 opacity-20 text-2xl font-black uppercase tracking-[0.4em]">Audit Stream Null</div>}
                            </div>
                        </motion.div>
                    )}

                    {/* DANGER ZONE (INFRASTRUCTURE CONTROL) */}
                    {activeTab === 'danger' && (
                        <motion.div key="danger" className="max-w-4xl mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="glass-card p-12 rounded-[50px] border-2 border-error/20 bg-error/[0.02] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-error via-red-500 to-error animate-pulse" />
                                
                                <div className="flex flex-col items-center text-center mb-16">
                                    <div className="w-24 h-24 rounded-[32px] bg-error/10 border-2 border-error/30 flex items-center justify-center text-error mb-8 shadow-[0_0_50px_rgba(255,59,48,0.2)]">
                                        <HiExclamation size={56} />
                                    </div>
                                    <h2 className="text-5xl font-black text-text-1 tracking-tighter mb-4 uppercase">Infrastructure Reset</h2>
                                    <p className="text-text-2 font-bold text-lg max-w-xl leading-relaxed">You are accessing the low-level administrative overrides. Actions performed here will trigger irreversible database-wide cascading deletions.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 bg-surface/40 border-2 border-border/60 rounded-[40px] hover:border-error/40 transition-all group">
                                        <h4 className="text-xl font-black text-text-1 mb-3 flex items-center gap-3"><HiUsers className="text-error"/> PURGE_ALL_USERS</h4>
                                        <p className="text-text-3 font-medium mb-8 text-sm">Eradicate every non-administrative identity in the registry. Cascades to all profile data and connections.</p>
                                        <button 
                                            onClick={() => { setNukeType('users'); setShowNukeModal(true); }}
                                            className="w-full py-5 rounded-2xl bg-error/10 text-error font-black text-xs tracking-widest border border-error/20 hover:bg-error hover:text-white transition-all shadow-lg group-active:scale-95">
                                            INITIATE USER PURGE
                                        </button>
                                    </div>
                                    <div className="p-8 bg-surface/40 border-2 border-border/60 rounded-[40px] hover:border-error/40 transition-all group">
                                        <h4 className="text-xl font-black text-text-1 mb-3 flex items-center gap-3"><HiDatabase className="text-error"/> PURGE_ALL_CONTENT</h4>
                                        <p className="text-text-3 font-medium mb-8 text-sm">Flash-wipe every post, story, and comment currently indexed. Permanent redaction of all media links.</p>
                                        <button 
                                            onClick={() => { setNukeType('content'); setShowNukeModal(true); }}
                                            className="w-full py-5 rounded-2xl bg-error/10 text-error font-black text-xs tracking-widest border border-error/20 hover:bg-error hover:text-white transition-all shadow-lg group-active:scale-95">
                                            INITIATE CONTENT PURGE
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-12 p-10 bg-black/40 border-2 border-error/50 rounded-[40px]">
                                    <div className="flex flex-col xl:flex-row justify-between items-center gap-8">
                                        <div className="flex-1">
                                            <h4 className="text-2xl font-black text-error mb-2 tracking-tighter">GLOBAL_INFRASTRUCTURE_RESET</h4>
                                            <p className="text-text-2 font-bold">Resets the entire PeerNet infrastructure to Genesis state. Only your administrator node will survive.</p>
                                        </div>
                                        <button 
                                            onClick={() => { setNukeType('full'); setShowNukeModal(true); }}
                                            className="px-12 py-6 bg-error text-white font-black text-sm tracking-[0.2em] rounded-3xl hover:brightness-125 shadow-[0_0_30px_rgba(255,59,48,0.4)] active:scale-95 transition-all">
                                            EXECUTE TOTAL NUKE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* --- SYSTEM MODALS --- */}
            
            <AnimatePresence>
                {/* Single Node Purge Modal */}
                {showPurgeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl" onClick={() => setShowPurgeModal(false)}>
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} onClick={e => e.stopPropagation()} className="w-full max-w-xl glass-card border border-error/30 p-12 rounded-[50px] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-error to-error/20" />
                            <HiExclamation size={80} className="text-error/20 absolute -top-4 -right-4 rotate-12" />
                            <h2 className="text-4xl font-black text-text-1 tracking-tighter mb-4">Confirm Node Purge</h2>
                            <p className="text-text-2 font-bold leading-relaxed mb-10">You are about to permanently disconnect this identity from the PeerNet backbone. All associated signals will be lost.</p>
                            <div className="flex gap-4">
                                <button className="flex-1 py-5 rounded-2xl border border-border font-black text-text-2 hover:bg-surface transition-all" onClick={() => setShowPurgeModal(false)}>ABORT_OPS</button>
                                <button className="flex-2 py-5 rounded-2xl bg-error text-white font-black shadow-lg shadow-error/20 hover:brightness-110 active:scale-95 transition-all" onClick={handleDeleteUser}>EXECUTE_PURGE</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* GLOBAL NUKE MODAL */}
                {showNukeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-error/10 backdrop-blur-3xl" onClick={() => setShowNukeModal(false)}>
                        <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-black border-4 border-error p-16 rounded-[60px] shadow-[0_0_100px_rgba(255,59,48,0.3)] relative">
                            <div className="flex flex-col items-center text-center">
                                <span className="px-6 py-2 bg-error text-white font-black text-xs tracking-[0.5em] mb-12 rounded-full">LEVEL 5 AUTHORIZATION REQUIRED</span>
                                <h3 className="text-5xl font-black text-white tracking-tighter mb-6 uppercase">Total {nukeType} Eradication</h3>
                                <p className="text-error font-black mb-10 tracking-widest leading-loose">CRITICAL: ALL OBJECTS IN CATEGORY [{nukeType.toUpperCase()}] WILL BE PERMANENTLY REDACTED FROM THE DATABASE. NO ROLLBACKS POSSIBLE.</p>
                                
                                <div className="w-full mb-12">
                                    <label className="block text-text-3 font-black text-[10px] tracking-[0.3em] uppercase mb-4">Enter Security Code to Confirm</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-error/5 border-2 border-error/30 text-error text-center text-3xl font-black p-6 rounded-3xl outline-none focus:border-error transition-all tracking-[0.2em]"
                                        placeholder="PURGE_NETWORK"
                                        value={nukeConfirm}
                                        onChange={e => setNukeConfirm(e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="flex gap-6 w-full">
                                    <button className="flex-1 py-6 rounded-3xl border-2 border-white/20 text-white font-black tracking-widest hover:bg-white/5 transition-all" onClick={() => setShowNukeModal(false)}>CANCEL</button>
                                    <button 
                                        onClick={handleNuke}
                                        disabled={nukeConfirm !== 'PURGE_NETWORK'}
                                        className="flex-2 py-6 rounded-3xl bg-error text-white font-black tracking-widest disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-error/40">
                                        EXECUTE_GLOBAL_PURGE
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
