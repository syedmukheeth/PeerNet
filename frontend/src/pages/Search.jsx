import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { HiSearch, HiBadgeCheck } from 'react-icons/hi'
import toast from 'react-hot-toast'


const pageVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.25 } } }

export default function Search() {
    const { user: me } = useAuth()
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [following, setFollowing] = useState({})

    const handleSearch = async (e) => {
        const val = e.target.value
        setQ(val)
        if (val.length < 2) { setResults([]); return }
        setLoading(true)
        try {
            const { data } = await api.get('/users/search', { params: { q: val, limit: 20 } })
            setResults(data.data || [])
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const handleFollow = async (userId, isFollowing) => {
        setFollowing(f => ({ ...f, [userId]: !isFollowing }))
        try {
            if (isFollowing) await api.delete(`/users/${userId}/follow`)
            else await api.post(`/users/${userId}/follow`)
        } catch (err) {
            setFollowing(f => ({ ...f, [userId]: isFollowing }))
            toast.error(err.response?.data?.message || 'Action failed')
        }
    }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="flex-col gap-5">
            <h1 className="t-heading">Search</h1>

            <div className="search-bar">
                <HiSearch className={`text-[19px] shrink-0 transition-colors ${loading ? 'text-accent' : 'text-muted'}`} />
                <input placeholder="Search by name or username…" value={q} onChange={handleSearch} autoFocus />
                {loading && <div className="spinner w-4 h-4" />}
            </div>

            {loading && q.length >= 2 && (
                <div key="search-skeleton" className="space-y-2 pt-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-2 py-4">
                            <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-4 w-32 rounded-md" />
                                <div className="skeleton h-3 w-20 rounded-md opacity-30" />
                            </div>
                            <div className="skeleton w-[88px] h-9 rounded-xl opacity-40" />
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div className="flex-col gap-0.5">
                        {results.map((u, i) => {
                            const isFollowing = following[u._id] !== undefined ? following[u._id] : u.isFollowing
                            const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            return (
                                <motion.div key={u._id} className="user-row flex justify-between items-center"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04, duration: 0.2 }}>
                                    <Link to={`/profile/${u._id}`} className="flex items-center gap-3">
                                        <img src={avatar} className="avatar avatar-md w-11 h-11" alt={u.username} />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="t-title text-[14px]">{u.username}</span>
                                                {u.isVerified && <HiBadgeCheck className="text-accent text-[14px]" />}
                                            </div>
                                            <div className="t-small text-muted">{u.fullName}</div>
                                            {u.followersCount > 0 && (
                                                <div className="t-small text-muted mt-0.5">
                                                    {u.followersCount >= 1000
                                                        ? (u.followersCount / 1000).toFixed(1) + 'K'
                                                        : u.followersCount} followers
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    {u._id !== me?._id && (
                                        <motion.button
                                            className={`btn btn-sm min-w-[88px] ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={() => handleFollow(u._id, isFollowing)}
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </motion.button>
                                    )}
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {q.length >= 2 && !loading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-surface-subtle flex items-center justify-center mb-6">
                        <HiSearch className="text-3xl text-muted/40" />
                    </div>
                    <p className="text-lg font-bold text-primary mb-1">No results found</p>
                    <p className="text-sm text-muted max-w-[200px]">No users found matching &quot;{q}&quot;</p>
                </div>
            )}
            {q.length < 2 && (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent/20 to-primary/10 flex items-center justify-center mb-8 relative">
                        <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping" />
                        <HiSearch className="text-4xl text-accent relative z-10" />
                    </div>
                    <p className="text-xl font-black tracking-tight text-primary mb-2 italic uppercase">Discover PeerNet</p>
                    <p className="text-[13px] font-medium text-muted/60 max-w-[220px] leading-relaxed uppercase tracking-widest">Search for creators, friends, and community leaders</p>
                </div>
            )}
        </motion.div>
    )
}
