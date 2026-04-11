import { useState, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import PostCard from '../components/PostCard'
import StoryRail from '../components/StoryRail'
import { PostSkeleton } from '../components/SkeletonLoader'
import { optimizeAvatarUrl } from '../utils/cloudinary'
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
        api.get('/users/search', { params: { q: 'an', limit: 8 } })
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

    const myAvatar = optimizeAvatarUrl(user?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Profile mini card ─────────────── */}
            <div className="glass-card" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', 
                borderRadius: 12,
                marginBottom: 24,
                transition: 'transform 0.2s',
                cursor: 'pointer'
            }} onClick={() => navigate(`/profile/${user?._id}`)}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={myAvatar}
                        style={{
                            width: 52, height: 52, borderRadius: '50%',
                            objectFit: 'cover', display: 'block',
                            border: '2px solid var(--accent)',
                            padding: 2
                        }}
                        alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                        <span style={{ 
                            fontWeight: 800, fontSize: 13.5, color: 'var(--text-1)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                            {user?.username}
                        </span>
                        {user?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                        {user?.fullName || 'PeerNet user'}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user?._id}`) }}
                    className="btn btn-xs"
                    style={{ 
                        background: 'rgba(255,255,255,0.08)', 
                        color: 'var(--text-2)', 
                        fontWeight: 700,
                        borderRadius: 18,
                        padding: '5px 12px',
                        border: '1px solid var(--border-md)',
                        fontSize: 11,
                        flexShrink: 0  // Added to prevent overlap
                    }}>
                    Switch
                </button>
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
                            const rawAv = u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            const av = optimizeAvatarUrl(rawAv)
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
    const queryClient = useQueryClient()

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['feed'],
        queryFn: async ({ pageParam = null }) => {
            const params = { limit: 10, _t: Date.now() }
            if (pageParam) params.cursor = pageParam
            const res = await api.get('/posts/feed', { params })
            return res.data
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
        staleTime: 30_000,         // 30s — don't refetch so often it wipes optimistic like state
        refetchOnMount: 'always',
    })

    const posts = data
        ? data.pages.flatMap((page) => (Array.isArray(page?.data) ? page.data : []))
        : []
    const loading = status === 'pending' || isFetchingNextPage

    const onLikeToggle = (postId, liked, likesCount) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: page.data.map(post => post._id === postId ? { ...post, isLiked: liked, likesCount } : post)
                }))
            }
        })
    }

    const onDelete = (postId) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: page.data.filter(post => post._id !== postId)
                }))
            }
        })
    }

    const onUpdate = (postId, updated) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: page.data.map(post => post._id === postId ? { ...post, ...updated } : post)
                }))
            }
        })
    }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            <div className="feed-layout">

                {/* ── Feed column ───────────── */}
                <div className="feed-col">
                    <StoryRail />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                        {posts.filter(Boolean).map(post => (
                            <PostCard key={post?._id || post?.id} post={post}
                                onLikeToggle={onLikeToggle}
                                onDelete={onDelete}
                                onUpdate={onUpdate} />
                        ))}
                    </div>
                    {loading && posts.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <PostSkeleton />
                            <PostSkeleton />
                            <PostSkeleton />
                        </div>
                    )}
                    {loading && posts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
                            <PostSkeleton />
                        </div>
                    )}
                    {!loading && posts.length === 0 && (
                        <div className="empty-state" style={{ marginTop: 40 }}>
                            <div className="empty-state-icon">👥</div>
                            <p className="empty-state-title">Your feed is empty</p>
                            <p className="empty-state-desc">Follow people to see their posts here</p>
                        </div>
                    )}
                    {hasNextPage && !loading && posts.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, paddingBottom: 32 }}>
                            <motion.button className="btn btn-secondary"
                                onClick={() => fetchNextPage()}
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
