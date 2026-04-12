import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiChartBar, HiTrash, 
    HiBadgeCheck, HiRefresh, HiCheckCircle 
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Admin() {
    const [activeTab, setActiveTab] = useState('stats')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

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

    const fetchPosts = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/posts')
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to fetch posts')
        }
    }, [])

    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([fetchStats(), fetchUsers(), fetchPosts()])
        setLoading(false)
    }, [fetchStats, fetchUsers, fetchPosts])

    useEffect(() => {
        init()
    }, [init])

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure? This will delete the user and ALL their data.')) return
        try {
            await api.delete(`/admin/users/${userId}`)
            toast.success('User deleted')
            fetchUsers()
            fetchStats()
        } catch {
            toast.error('Failed to delete user')
        }
    }

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post permanently?')) return
        try {
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Post removed')
            fetchPosts()
            fetchStats()
        } catch {
            toast.error('Failed to delete post')
        }
    }

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('User verification updated')
            fetchUsers()
        } catch {
            toast.error('Verification toggle failed')
        }
    }

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div className="admin-page fade-in">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="t-heading" style={{ fontSize: 28 }}>Admin Console</h1>
                    <p className="t-small" style={{ opacity: 0.5 }}>Hardware Governance & Moderation</p>
                </div>
                <button className="admin-action-btn" onClick={init}>
                    <HiRefresh /> Sync Data
                </button>
            </header>

            {/* Stats Overview */}
            <div className="admin-stats-grid">
                {[
                    { label: 'Total Node Users', value: stats?.userCount || 0, icon: <HiUsers /> },
                    { label: 'Cloud Resources', value: stats?.postCount || 0, icon: <HiCollection /> },
                    { label: 'Active Stories', value: stats?.storyCount || 0, icon: <HiChartBar /> },
                    { label: 'Video Bandwidth', value: stats?.dscrollCount || 0, icon: <HiCollection /> },
                ].map(s => (
                    <motion.div key={s.label} className="glass-card admin-stat-card" whileHover={{ y: -4 }}>
                        <span className="admin-stat-label">{s.label}</span>
                        <span className="admin-stat-value">{s.value}</span>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <nav className="admin-tabs">
                <button 
                    className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}>
                    User Registry
                </button>
                <button 
                    className={`admin-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}>
                    Content Audit
                </button>
            </nav>

            {/* Tab Panels */}
            <div className="admin-tab-content">
                <AnimatePresence mode="wait">
                    {activeTab === 'users' ? (
                        <motion.div 
                            key="users"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}>
                            <div className="admin-search-bar">
                                <input 
                                    className="input" 
                                    placeholder="Search nodes by username/email..." 
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                        fetchUsers(e.target.value)
                                    }}
                                />
                            </div>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>Network Address</th>
                                            <th>Role</th>
                                            <th>Auth Status</th>
                                            <th>Governance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u._id}>
                                                <td>
                                                    <div className="admin-user-cell">
                                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`} className="admin-user-avatar" alt="" />
                                                        <div className="flex-col">
                                                            <span className="font-bold text-text-1">@{u.username}</span>
                                                            <span className="t-small" style={{ fontSize: 11 }}>{u.fullName}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <span className={`badge ${u.role === 'admin' ? 'bg-accent' : 'bg-surface'}`} style={{ textTransform: 'uppercase', fontSize: 9 }}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.isVerified ? (
                                                        <span className="flex items-center gap-1 text-accent font-bold" style={{ fontSize: 12 }}>
                                                            <HiCheckCircle /> Verified
                                                        </span>
                                                    ) : (
                                                        <span className="text-text-3" style={{ fontSize: 12 }}>Unverified</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            className={`admin-action-btn ${u.isVerified ? '' : 'admin-action-btn--primary'}`}
                                                            onClick={() => handleToggleVerify(u._id)}>
                                                            <HiBadgeCheck /> {u.isVerified ? 'Revoke' : 'Verify'}
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <button 
                                                                className="admin-action-btn admin-action-btn--danger"
                                                                onClick={() => handleDeleteUser(u._id)}>
                                                                <HiTrash /> Purge
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
                    ) : (
                        <motion.div 
                            key="content"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Origin</th>
                                            <th>Intel Payload</th>
                                            <th>Type</th>
                                            <th>Creation Date</th>
                                            <th>Governance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.map(p => (
                                            <tr key={p._id}>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <img src={p.author?.avatarUrl || `https://ui-avatars.com/api/?name=${p.author?.username}&background=6366F1&color=fff`} className="w-6 h-6 rounded-full" alt="" />
                                                        <span className="font-bold text-[13px]">@{p.author?.username}</span>
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: 300 }}>
                                                    <p className="truncate text-text-2" style={{ fontSize: 13 }}>{p.caption || 'No caption'}</p>
                                                    {p.mediaUrl && <span className="t-small" style={{ fontSize: 10, opacity: 0.5 }}>Media ID: {p.mediaPublicId?.slice(0, 10)}...</span>}
                                                </td>
                                                <td>
                                                    <span className="text-[11px] uppercase p-1 bg-surface border border-border rounded">
                                                        {p.mediaType || 'text'}
                                                    </span>
                                                </td>
                                                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <button 
                                                        className="admin-action-btn admin-action-btn--danger"
                                                        onClick={() => handleDeletePost(p._id)}>
                                                        <HiTrash /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
