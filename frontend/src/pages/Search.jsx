import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { HiSearch, HiBadgeCheck, HiX } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function Search() {
    const { user: me } = useAuth()
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [following, setFollowing] = useState({})
    const [focused, setFocused] = useState(false)
    const inputRef = useRef()

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

    const clearSearch = () => {
        setQ('')
        setResults([])
        inputRef.current?.focus()
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

    const hasQuery = q.length >= 2

    return (
        <div className="ig-search-page">
            {/* ── Search Bar ── */}
            <div className="ig-search-bar-wrap">
                <div className={`ig-search-bar ${focused ? 'focused' : ''}`}>
                    <HiSearch className={`ig-search-icon ${loading ? 'loading' : ''}`} />
                    <input
                        ref={inputRef}
                        className="ig-search-input"
                        placeholder="Search"
                        value={q}
                        onChange={handleSearch}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoComplete="off"
                    />
                    {q && (
                        <button className="ig-search-clear" onClick={clearSearch}>
                            <HiX size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Loading Skeletons ── */}
            {loading && hasQuery && (
                <div className="ig-search-skeleton">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="ig-skeleton-row">
                            <div className="skeleton ig-skeleton-avatar" />
                            <div className="ig-skeleton-lines">
                                <div className="skeleton ig-skeleton-name" />
                                <div className="skeleton ig-skeleton-sub" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Results ── */}
            <AnimatePresence>
                {!loading && hasQuery && results.length > 0 && (
                    <motion.div
                        className="ig-search-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {results.map((u, i) => {
                            const isFollowing = following[u._id] !== undefined ? following[u._id] : u.isFollowing
                            const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            return (
                                <motion.div
                                    key={u._id}
                                    className="ig-result-row"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.035, duration: 0.18 }}
                                >
                                    <Link to={`/profile/${u._id}`} className="ig-result-user">
                                        <div className="ig-result-avatar-wrap">
                                            <img src={avatar} className="ig-result-avatar" alt={u.username} />
                                        </div>
                                        <div className="ig-result-info">
                                            <div className="ig-result-username">
                                                <span>{u.username}</span>
                                                {u.isVerified && <HiBadgeCheck className="ig-verified" />}
                                            </div>
                                            {u.fullName && (
                                                <div className="ig-result-fullname">{u.fullName}</div>
                                            )}
                                            {u.followersCount > 0 && (
                                                <div className="ig-result-meta">
                                                    {u.followersCount >= 1000
                                                        ? (u.followersCount / 1000).toFixed(1) + 'K'
                                                        : u.followersCount} followers
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    {u._id !== me?._id && (
                                        <motion.button
                                            className={`ig-follow-btn ${isFollowing ? 'following' : ''}`}
                                            onClick={() => handleFollow(u._id, isFollowing)}
                                            whileTap={{ scale: 0.94 }}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </motion.button>
                                    )}
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── No Results ── */}
            {hasQuery && !loading && results.length === 0 && (
                <motion.div
                    className="ig-search-empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="ig-empty-icon-wrap">
                        <HiSearch size={26} />
                    </div>
                    <p className="ig-empty-title">No results</p>
                    <p className="ig-empty-sub">No account found for "<strong>{q}</strong>"</p>
                </motion.div>
            )}

            {/* ── Initial Empty State (no query) ── */}
            {!hasQuery && !loading && results.length === 0 && (
                <motion.div
                    className="ig-search-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="ig-empty-icon-wrap">
                        <HiSearch size={26} />
                    </div>
                    <p className="ig-empty-title">Search PeerNet</p>
                    <p className="ig-empty-sub">Find creators, friends,<br />and community leaders</p>
                </motion.div>
            )}
        </div>
    )
}
