import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import PostCard from '../components/PostCard'
import StoryRail from '../components/StoryRail'
import { useAuth } from '../context/AuthContext'
import { HiBadgeCheck } from 'react-icons/hi'

const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
}

const FOOTER_LINKS = ['About', 'Help', 'Press', 'API', 'Privacy', 'Terms', 'Locations', 'Language']

/* ── Right Panel ─────────────────────────────────────────── */
function RightPanel() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [suggestions, setSuggestions] = useState([])
    const [following, setFollowing] = useState({})

    useEffect(() => {
        if (!user) return
        api.get('/users/search', { params: { q: '', limit: 5 } })
            .then(({ data }) => setSuggestions((data.data || []).filter(u => u._id !== user._id).slice(0, 5)))
            .catch(() => { })
    }, [user])

    const handleFollow = async (u) => {
        try {
            await api.post(`/users/${u._id}/follow`)
            setFollowing(f => ({ ...f, [u._id]: !f[u._id] }))
        } catch { /* silent */ }
    }

    const myAvatar = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    return (
        <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Mini Profile Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img src={myAvatar}
                        onClick={() => navigate(`/profile/${user?._id}`)}
                        style={{
                            width: 52, height: 52, borderRadius: '50%',
                            objectFit: 'cover', cursor: 'pointer', display: 'block',
                            border: '2px solid var(--border-md)',
                        }} alt="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Link to={`/profile/${user?._id}`} style={{
                                fontWeight: 700, fontSize: 14, color: 'var(--text-1)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {user?.username}
                            </Link>
                            {user?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }} />}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.fullName || 'PeerNet user'}
                        </div>
                    </div>
                    <Link to={`/profile/${user?._id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                        View
                    </Link>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 14,
                        }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Suggested for you
                            </span>
                            <Link to="/search" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                                See all
                            </Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {suggestions.map(u => {
                                const av = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                                const isFollowing = following[u._id]
                                return (
                                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Link to={`/profile/${u._id}`}>
                                            <img src={av} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                        </Link>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Link to={`/profile/${u._id}`} style={{ color: 'var(--text-1)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 13 }}>
                                                    {u.username}
                                                    {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 12 }} />}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                                                    {u.fullName || 'Suggested for you'}
                                                </div>
                                            </Link>
                                        </div>
                                        <button onClick={() => handleFollow(u)} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: isFollowing ? 'var(--text-3)' : 'var(--accent)',
                                            fontWeight: 700, fontSize: 12, flexShrink: 0,
                                        }}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginBottom: 8 }}>
                        {FOOTER_LINKS.map(l => (
                            <a key={l} href="#" style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none' }}
                                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                                {l}
                            </a>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        © 2025 PeerNet
                    </p>
                </div>

            </div>
        </div>
    )
}

/* ── Feed ─────────────────────────────────────────────────── */
export default function Feed() {
    const [posts, setPosts] = useState([])
    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)

    const fetchFeed = useCallback(async (cur = null) => {
        if (loading) return
        setLoading(true)
        try {
            const params = { limit: 10 }
            if (cur) params.cursor = cur
            const { data } = await api.get('/posts/feed', { params })
            setPosts(p => cur ? [...p, ...data.data] : data.data)
            setCursor(data.nextCursor)
            setHasMore(data.hasMore)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }, [loading])

    useEffect(() => { fetchFeed() }, []) // eslint-disable-line

    const onLikeToggle = (postId, liked, likesCount) => {
        setPosts(p => p.map(post => post._id === postId ? { ...post, isLiked: liked, likesCount } : post))
    }
    const onDelete = (postId) => setPosts(p => p.filter(post => post._id !== postId))
    const onUpdate = (postId, updated) => {
        setPosts(p => p.map(post => post._id === postId ? { ...post, ...updated } : post))
    }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            {/* 2-col layout: feed + right panel */}
            <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>

                {/* Feed column */}
                <div style={{ flex: 1, minWidth: 0, maxWidth: 600 }}>
                    <StoryRail />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                        {posts.map(post => (
                            <PostCard key={post._id} post={post}
                                onLikeToggle={onLikeToggle}
                                onDelete={onDelete}
                                onUpdate={onUpdate} />
                        ))}
                    </div>

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                            <div className="spinner" />
                        </div>
                    )}

                    {!loading && posts.length === 0 && (
                        <div className="empty-state" style={{ marginTop: 40 }}>
                            <div className="empty-state-icon">👥</div>
                            <p className="empty-state-title">Your feed is empty</p>
                            <p className="empty-state-desc">Follow people to see their posts here</p>
                        </div>
                    )}

                    {hasMore && !loading && posts.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                            <motion.button className="btn btn-secondary"
                                onClick={() => fetchFeed(cursor)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}>
                                Load more
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* Right panel — hidden below 1024px */}
                <div className="feed-right-panel">
                    <RightPanel />
                </div>

            </div>
        </motion.div>
    )
}
