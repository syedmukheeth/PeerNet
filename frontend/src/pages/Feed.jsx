import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import PostCard from '../components/PostCard'
import StoryRail from '../components/StoryRail'
import { useAuth } from '../context/AuthContext'
import { HiBadgeCheck } from 'react-icons/hi'
import { FaLinkedin } from 'react-icons/fa'

const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
}

/* ── Right Panel ─────────────────────────────────────────── */
function RightPanel() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [suggestions, setSuggestions] = useState([])
    const [followed, setFollowed] = useState({})

    useEffect(() => {
        if (!user) return
        // Try fetching some users to suggest
        api.get('/users/search', { params: { q: 'a', limit: 8 } })
            .then(({ data }) => {
                const others = (data.data || []).filter(u => u._id !== user._id)
                setSuggestions(others.slice(0, 5))
            })
            .catch(() => { })
    }, [user])

    const handleFollow = async (u) => {
        setFollowed(f => ({ ...f, [u._id]: !f[u._id] }))
        try { await api.post(`/users/${u._id}/follow`) }
        catch { setFollowed(f => ({ ...f, [u._id]: !f[u._id] })) }
    }

    const myAvatar = user?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Profile mini card ─────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingBottom: 20, borderBottom: '1px solid var(--border)',
            }}>
                <div onClick={() => navigate(`/profile/${user?._id}`)}
                    style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                    <img src={myAvatar}
                        style={{
                            width: 54, height: 54, borderRadius: '50%',
                            objectFit: 'cover', display: 'block',
                            border: '2px solid var(--border-md)',
                        }}
                        alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link to={`/profile/${user?._id}`}
                            style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', textDecoration: 'none' }}>
                            {user?.username}
                        </Link>
                        {user?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.fullName || 'PeerNet user'}
                    </div>
                </div>
                <Link to={`/profile/${user?._id}`}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, textDecoration: 'none' }}>
                    Switch
                </Link>
            </div>

            {/* ── Suggested for you ─────────────── */}
            {suggestions.length > 0 && (
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16,
                    }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>
                            Suggested for you
                        </span>
                        <Link to="/search"
                            style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none' }}>
                            See all
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        {suggestions.map(u => {
                            const av = u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            const isFollowed = followed[u._id]
                            return (
                                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Link to={`/profile/${u._id}`} style={{ flexShrink: 0 }}>
                                        <img src={av}
                                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                                            alt="" />
                                    </Link>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Link to={`/profile/${u._id}`} style={{ textDecoration: 'none', color: 'var(--text-1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}>
                                                {u.username}
                                                {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 12 }} />}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                                                Suggested for you
                                            </div>
                                        </Link>
                                    </div>
                                    <button onClick={() => handleFollow(u)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: isFollowed ? 'var(--text-3)' : 'var(--accent)',
                                        fontWeight: 700, fontSize: 12, flexShrink: 0,
                                        transition: 'color 150ms',
                                    }}>
                                        {isFollowed ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Footer ───────────────────────── */}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a
                    href="https://www.linkedin.com/in/syedmukheeth"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: '#0A66C2', fontWeight: 600,
                        textDecoration: 'none', transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <FaLinkedin style={{ fontSize: 15 }} />
                    Syed Mukheeth
                </a>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                    Built by Syed Mukheeth · © 2026 PeerNet
                </p>
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
    const loadingRef = useRef(false)

    const fetchFeed = useCallback(async (cur = null) => {
        if (loadingRef.current) return
        loadingRef.current = true
        setLoading(true)
        try {
            const params = { limit: 10 }
            if (cur) params.cursor = cur
            const { data } = await api.get('/posts/feed', { params })
            setPosts(p => cur ? [...p, ...data.data] : data.data)
            setCursor(data.nextCursor)
            setHasMore(data.hasMore)
        } catch { /* silent */ }
        finally { loadingRef.current = false; setLoading(false) }
    }, [])

    useEffect(() => { fetchFeed() }, [fetchFeed])

    const onLikeToggle = (postId, liked, likesCount) =>
        setPosts(p => p.map(post => post._id === postId ? { ...post, isLiked: liked, likesCount } : post))
    const onDelete = (postId) => setPosts(p => p.filter(post => post._id !== postId))
    const onUpdate = (postId, updated) =>
        setPosts(p => p.map(post => post._id === postId ? { ...post, ...updated } : post))

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            <div className="feed-layout">

                {/* ── Feed column ───────────── */}
                <div className="feed-col">
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
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, paddingBottom: 32 }}>
                            <motion.button className="btn btn-secondary"
                                onClick={() => fetchFeed(cursor)}
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                Load more
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* ── Right panel ───────────── */}
                <aside className="feed-right-panel">
                    <RightPanel />
                </aside>

            </div>
        </motion.div>
    )
}
