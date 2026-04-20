import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiChartBar, HiTrash, 
    HiBadgeCheck, HiRefresh, HiInbox,
    HiLightningBolt, HiShieldCheck, HiArrowRight,
    HiVideoCamera, HiExclamation,
    HiKey, HiDatabase, HiGlobe, HiEye, HiSearch,
    HiLockClosed
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
        <div className="admin-page fade-in pb-20 p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto">
            
            {/* --- DASHBOARD HEADER --- */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 glass-card p-10 rounded-[40px] border border-border/40 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-transparent pointer-events-none rounded-[40px]" />
                
                <div className="relative z-10 flex items-center gap-8">
                    <div className="p-6 bg-accent/10 text-accent rounded-3xl">
                        <HiShieldCheck size={44} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-[10px] font-bold tracking-[0.1em] uppercase">Private Console</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-1 tracking-tight mt-2">Admin Dashboard</h1>
                        <p className="text-text-2 mt-2 font-medium max-w-lg">Manage users, moderate content, and monitor system performance from a central hub.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10 w-full xl:w-auto">
                    <button onClick={init} className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-surface/50 border border-border hover:border-accent/40 hover:bg-surface text-[14px] font-bold transition-all text-text-1 active:scale-95">
                        <HiRefresh size={20} className="text-accent"/> 
                        Refresh Data
                    </button>
                    <div className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-success/5 text-success rounded-2xl text-[12px] font-bold border border-success/20 uppercase tracking-widest">
                        <span className="w-2.5 h-2.5 bg-success rounded-full" />
                        System Online
                    </div>
                </div>
            </header>

            {/* --- OVERVIEW STATS --- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {[
                    { label: 'Total Users', value: stats?.userCount || 0, icon: <HiUsers />, color: '#4F7AFF', sub: 'Registered members' },
                    { label: 'Total Posts', value: stats?.postCount || 0, icon: <HiCollection />, color: '#7C3AED', sub: 'Shared by community' },
                    { label: 'Daily Stories', value: stats?.storyCount || 0, icon: <HiLightningBolt />, color: '#06B6D4', sub: 'Recent activities' },
                    { label: 'Storage Usage', value: stats?.bandwidthUsage || '0 GB', icon: <HiChartBar />, color: '#30D158', sub: 'Total media weight' }
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass-card p-8 rounded-[40px] border border-border/40 hover:border-accent/30 transition-all duration-500">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-4 rounded-[22px] bg-surface shadow-sm text-3xl transition-transform group-hover:scale-110 duration-500" style={{ color: s.color }}>
                                {s.icon}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-text-3 uppercase tracking-wider">{s.label}</span>
                                <span className="text-[11px] font-medium text-text-3 opacity-40 mt-0.5">{s.sub}</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-text-1 tracking-tighter">{s.value}</span>
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* --- NAVIGATION TABS --- */}
            <nav className="flex flex-wrap gap-2 p-2 bg-surface/30 backdrop-blur-xl rounded-[30px] border border-border/40 w-fit mb-12 mb-12">
                {[
                    { id: 'overview', label: 'Overview', icon: <HiGlobe /> },
                    { id: 'users', label: 'User Directory', icon: <HiUsers /> },
                    { id: 'content', label: 'Moderation', icon: <HiEye /> },
                    { id: 'feedback', label: 'Feedback', icon: <HiInbox /> },
                    { id: 'danger', label: 'Maintenance', icon: <HiLockClosed />, color: '#EB5757' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        className={`flex items-center gap-3 px-8 py-4 rounded-[22px] font-bold text-[13px] transition-all relative ${activeTab === tab.id ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-text-2 hover:text-text-1'}`}
                        style={activeTab === tab.id && tab.color ? { background: tab.color } : {}}
                        onClick={() => setActiveTab(tab.id)}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </nav>

            {/* --- MAIN VIEWS --- */}
            <main className="min-h-[600px] relative">
                <AnimatePresence mode="wait">
                    
                    {/* DASHBOARD OVERVIEW */}
                    {activeTab === 'overview' && (
                        <motion.div key="overview" className="grid grid-cols-1 xl:grid-cols-3 gap-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <div className="xl:col-span-2 glass-card p-10 rounded-[40px] border border-border/40">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-black text-text-1 flex items-center gap-4">
                                        <div className="p-3 bg-accent/10 rounded-2xl text-accent"><HiGlobe /></div> Recent Activity
                                    </h3>
                                    <button className="text-accent font-bold text-xs uppercase hover:underline" onClick={() => setActiveTab('feedback')}>Manage Feedback</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {feedback.slice(0, 4).map(f => (
                                        <div key={f._id} className="p-6 bg-surface/30 border border-border/40 rounded-3xl flex flex-col gap-4 group hover:border-accent/40 transition-all">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-xl ${f.type === 'bug' ? 'bg-error/10 text-error border border-error/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>{f.type}</span>
                                                <span className="text-[11px] font-bold text-text-3 opacity-40">{new Date(f.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[15px] text-text-1 font-medium line-clamp-2 leading-relaxed h-12">{f.content}</p>
                                            <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-2">
                                                <span className="text-xs font-bold text-text-3 opacity-60">@{f.userId?.username || 'Guest'}</span>
                                                <HiArrowRight className="text-accent opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                    {feedback.length === 0 && <div className="col-span-2 text-center py-20 opacity-30 text-lg font-bold uppercase tracking-widest">No recent reports</div>}
                                </div>
                            </div>
                            
                            <div className="glass-card p-10 rounded-[40px] border border-border/40">
                                <h3 className="text-2xl font-black text-text-1 mb-10 flex items-center gap-4">
                                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><HiUsers /></div> Key Users
                                </h3>
                                <div className="flex flex-col gap-5">
                                    {users.slice(0, 6).map(u => (
                                        <div key={u._id} className="flex items-center justify-between p-5 bg-surface/30 rounded-3xl border border-border/40 hover:bg-surface/60 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=202020&color=fff`} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                                                    {u.isVerified && <div className="absolute -bottom-1 -right-1 p-1 bg-accent rounded-full border-2 border-surface"><HiBadgeCheck className="text-white text-xs"/></div>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-bold text-text-1">@{u.username}</span>
                                                    <span className="text-[10px] font-bold text-text-3 uppercase opacity-40">{u.role}</span>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-xl border ${u.isVerified ? 'border-accent/30 text-accent bg-accent/5' : 'border-border text-text-3 opacity-20'}`}>
                                                <HiShieldCheck size={18} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* USER DIRECTORY */}
                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 mb-10">
                                <div className="relative flex-1">
                                    <HiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-text-3 text-xl opacity-40" />
                                    <input 
                                        className="w-full bg-surface/50 border border-border/60 text-text-1 rounded-[25px] pl-16 pr-8 py-5 outline-none focus:border-accent/40 focus:bg-surface transition-all font-bold placeholder-text-3 tracking-wide" 
                                        placeholder="Search by username, ID, or email..." 
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value)
                                            fetchUsers(e.target.value)
                                        }}
                                    />
                                </div>
                                <button onClick={() => fetchUsers(search)} className="px-10 py-5 bg-accent text-white rounded-[25px] font-bold text-sm transition-all hover:brightness-110 active:scale-95">Find Users</button>
                            </div>
                            
                            <div className="glass-card border border-border/40 rounded-[40px] overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-surface/50 border-b border-border/40">
                                            <th className="px-10 py-7 text-[12px] font-bold uppercase tracking-wider text-text-3">User Profile</th>
                                            <th className="px-10 py-7 text-[12px] font-bold uppercase tracking-wider text-text-3">Verification</th>
                                            <th className="px-10 py-7 text-[12px] font-bold uppercase tracking-wider text-text-3">Account Type</th>
                                            <th className="px-10 py-7 text-[12px] font-bold uppercase tracking-wider text-text-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {users.map(u => (
                                            <tr key={u._id} className="hover:bg-surface/40 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=4F7AFF&color=fff`} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-text-1 text-lg">@{u.username}</span>
                                                            <span className="text-xs text-text-3 font-medium opacity-50">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    {u.isVerified ? (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-2xl font-bold text-[10px] border border-success/10 tracking-widest">
                                                            <HiBadgeCheck size={16} /> VERIFIED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface text-text-3 rounded-2xl font-bold text-[10px] border border-border tracking-widest opacity-30">
                                                            UNVERIFIED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className={`text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded-2xl border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-surface border-border text-text-2'}`}>
                                                        {u.role === 'admin' ? 'Administrator' : 'Standard User'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleToggleVerify(u._id)} title="Update verification" className="p-3.5 rounded-2xl bg-surface border border-border hover:bg-accent hover:border-accent hover:text-white transition-all">
                                                            <HiKey size={20} />
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <button onClick={() => confirmDeleteUser(u._id)} title="Delete user account" className="p-3.5 rounded-2xl bg-surface border border-border hover:bg-error hover:border-error hover:text-white transition-all">
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
                        </motion.div>
                    )}

                    {/* MODERATION FEED */}
                    {activeTab === 'content' && (
                        <motion.div key="content" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="flex flex-wrap gap-4 mb-10">
                                {['all', 'image', 'video'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => { setContentType(t); fetchPosts(t); }}
                                        className={`px-8 py-4 rounded-2xl font-bold text-xs tracking-widest uppercase transition-all ${contentType === t ? 'bg-accent text-white' : 'bg-surface/50 text-text-3 border border-border/40 hover:border-accent/40'}`}
                                    >
                                        {t === 'all' ? 'All Content' : t + 's'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {posts.map(p => (
                                    <div key={p._id} className="glass-card rounded-[40px] border border-border/40 overflow-hidden group hover:border-accent/30 transition-all">
                                        <div className="aspect-square relative overflow-hidden bg-black">
                                            {p.mediaType === 'video' ? (
                                                <video src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <img src={p.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                            )}
                                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1">
                                                <button onClick={() => handleDeletePost(p._id)} className="p-3.5 bg-error text-white rounded-2xl shadow-xl hover:brightness-110 active:scale-90 transition-all" title="Delete content">
                                                    <HiTrash size={20} />
                                                </button>
                                            </div>
                                            {p.mediaType === 'video' && (
                                                <div className="absolute bottom-6 left-6 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white">
                                                    <HiVideoCamera />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8">
                                            <div className="flex items-center gap-4 mb-4">
                                                <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=202020&color=fff`} className="w-10 h-10 rounded-xl" alt="" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text-1">@{p.author?.username}</span>
                                                    <span className="text-[10px] font-bold text-text-3 uppercase opacity-40">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-text-2 font-medium line-clamp-2 leading-relaxed opacity-80">&ldquo;{p.caption || 'No caption'}&rdquo;</p>
                                        </div>
                                    </div>
                                ))}
                                {posts.length === 0 && <div className="col-span-full text-center py-40 opacity-20 text-2xl font-bold uppercase tracking-widest">No content found</div>}
                            </div>
                        </motion.div>
                    )}

                    {/* MAINTENANCE & DANGER ZONE */}
                    {activeTab === 'danger' && (
                        <motion.div key="danger" className="max-w-4xl mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="glass-card p-12 rounded-[50px] border-2 border-error/10 bg-error/[0.01] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-error/20" />
                                
                                <div className="flex flex-col items-center text-center mb-16">
                                    <div className="w-20 h-20 rounded-[28px] bg-error/10 flex items-center justify-center text-error mb-8">
                                        <HiExclamation size={48} />
                                    </div>
                                    <h2 className="text-4xl font-black text-text-1 tracking-tight mb-4 uppercase">System Maintenance</h2>
                                    <p className="text-text-2 font-bold text-lg max-w-xl leading-relaxed">Warning: These operations are irreversible and will permanently delete data from the PeerNet database.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 bg-surface/30 border border-border/60 rounded-[40px] hover:border-error/30 transition-all group">
                                        <h4 className="text-xl font-bold text-text-1 mb-3 flex items-center gap-3">Clear User Data</h4>
                                        <p className="text-text-3 font-medium mb-8 text-sm">Delete all standard user accounts and their private profiles from the database.</p>
                                        <button 
                                            onClick={() => { setNukeType('users'); setShowNukeModal(true); }}
                                            className="w-full py-5 rounded-2xl border border-error/30 text-error font-bold text-xs tracking-widest hover:bg-error hover:text-white transition-all">
                                            Start User Purge
                                        </button>
                                    </div>
                                    <div className="p-8 bg-surface/30 border border-border/60 rounded-[40px] hover:border-error/30 transition-all group">
                                        <h4 className="text-xl font-bold text-text-1 mb-3 flex items-center gap-3">Clear All Media</h4>
                                        <p className="text-text-3 font-medium mb-8 text-sm">Delete every post, story, and comment currently hosted on the platform.</p>
                                        <button 
                                            onClick={() => { setNukeType('content'); setShowNukeModal(true); }}
                                            className="w-full py-5 rounded-2xl border border-error/30 text-error font-bold text-xs tracking-widest hover:bg-error hover:text-white transition-all">
                                            Start Content Purge
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-12 p-10 bg-surface/60 border border-error/10 rounded-[40px]">
                                    <div className="flex flex-col xl:flex-row justify-between items-center gap-8">
                                        <div className="flex-1">
                                            <h4 className="text-2xl font-bold text-text-1 mb-2 tracking-tight">Global System Reset</h4>
                                            <p className="text-text-2 font-medium">Reset the entire platform to its initial state. Only your administrator account will be kept.</p>
                                        </div>
                                        <button 
                                            onClick={() => { setNukeType('full'); setShowNukeModal(true); }}
                                            className="px-12 py-6 bg-error text-white font-black text-sm tracking-widest rounded-3xl hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-error/10">
                                            RESET NETWORK
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
                {/* Delete User Modal */}
                {showPurgeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={() => setShowPurgeModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-xl glass-card p-12 rounded-[50px] shadow-2xl relative">
                            <h2 className="text-4xl font-black text-text-1 tracking-tight mb-4">Delete Account?</h2>
                            <p className="text-text-2 font-bold mb-10 leading-relaxed">This will permanently remove the user and all their content from PeerNet. This action cannot be undone.</p>
                            <div className="flex gap-4">
                                <button className="flex-1 py-5 rounded-2xl border border-border font-bold text-text-2 hover:bg-surface transition-all" onClick={() => setShowPurgeModal(false)}>Cancel</button>
                                <button className="flex-1 py-5 rounded-2xl bg-error text-white font-bold transition-all hover:scale-105 active:scale-95" onClick={handleDeleteUser}>Confirm Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* System Nuke Modal */}
                {showNukeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-error/5 backdrop-blur-3xl" onClick={() => setShowNukeModal(false)}>
                        <motion.div initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-surface border-2 border-border p-16 rounded-[60px] shadow-2xl relative">
                            <div className="flex flex-col items-center text-center">
                                <h3 className="text-5xl font-black text-text-1 tracking-tighter mb-6 uppercase">System Reset</h3>
                                <p className="text-error font-bold mb-10 tracking-wide leading-relaxed">WARNING: This will permanently wipe all {nukeType} data. There is no way to restore this information.</p>
                                
                                <div className="w-full mb-12">
                                    <label className="block text-text-3 font-bold text-xs uppercase mb-4 opacity-40">Type "PURGE_NETWORK" to confirm</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface border-2 border-border text-center text-3xl font-black p-6 rounded-3xl outline-none focus:border-error transition-all tracking-widest uppercase"
                                        placeholder="Confirm..."
                                        value={nukeConfirm}
                                        onChange={e => setNukeConfirm(e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="flex gap-6 w-full">
                                    <button className="flex-1 py-6 rounded-3xl border border-border text-text-1 font-bold hover:bg-surface transition-all" onClick={() => setShowNukeModal(false)}>Cancel</button>
                                    <button 
                                        onClick={handleNuke}
                                        disabled={nukeConfirm !== 'PURGE_NETWORK'}
                                        className="flex-1 py-6 rounded-3xl bg-error text-white font-black tracking-widest disabled:opacity-20 transition-all hover:scale-105 active:scale-95">
                                        Execute Reset
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

