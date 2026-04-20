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
        api.get('/users/search', { params: { q: 'a', limit: 6 } })
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
        <div className="sp-container">

            {/* ── Current User Card ───────────── */}
            <div className="sp-user-card">
                <img 
                    src={myAvatar}
                    className="sp-user-avatar"
                    alt="" 
                    onClick={() => navigate(`/profile/${user?._id}`)}
                />
                <div className="sp-user-info">
                    <div className="sp-username" onClick={() => navigate(`/profile/${user?._id}`)}>
                        {user?.username}
                        {user?.isVerified && <HiBadgeCheck className="text-accent" />}
                    </div>
                    <div className="sp-fullname">{user?.fullName || 'PeerNet Creator'}</div>
                </div>
                <button 
                    onClick={() => navigate(`/profile/${user?._id}`)}
                    className="sp-action-link"
                >
                    Switch
                </button>
            </div>

            {/* ── Suggestions Section ─────────── */}
            {suggestions.length > 0 && (
                <div className="mt-2">
                    <div className="sp-section-header">
                        <span className="sp-section-title">Suggested for you</span>
                        <Link to="/search" className="sp-action-link sp-action-link--muted">See All</Link>
                    </div>

                    <div className="flex flex-col">
                        {suggestions.map((u, idx) => {
                            const av = optimizeAvatarUrl(u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`)
                            const isFollowed = followed[u._id]
                            return (
                                <motion.div 
                                    key={u._id} 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * idx }}
                                    className="sp-suggestion-row"
                                >
                                    <img 
                                        src={av} 
                                        className="sp-suggestion-avatar" 
                                        alt="" 
                                        onClick={() => navigate(`/profile/${u._id}`)}
                                    />
                                    <div className="sp-suggestion-info">
                                        <div 
                                            className="sp-suggestion-username"
                                            onClick={() => navigate(`/profile/${u._id}`)}
                                        >
                                            {u.username}
                                            {u.isVerified && <HiBadgeCheck className="text-accent" />}
                                        </div>
                                        <div className="sp-suggestion-subtext">Followed by PeerNet</div>
                                    </div>
                                    <button 
                                        onClick={() => handleFollow(u)} 
                                        className={`sp-btn-follow ${isFollowed ? 'active' : ''}`}
                                    >
                                        {isFollowed ? 'Following' : 'Follow'}
                                    </button>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Refined Footer ──────────────── */}
            <div className="sp-footer">
                <nav className="sp-footer-links">
                    <Link to="/legal" className="sp-footer-link">About</Link>
                    <Link to="/legal" className="sp-footer-link">Help</Link>
                    <Link to="/legal" className="sp-footer-link">Press</Link>
                    <Link to="/legal" className="sp-footer-link">API</Link>
                    <Link to="/legal" className="sp-footer-link">Jobs</Link>
                    <Link to="/legal" className="sp-footer-link">Privacy</Link>
                    <Link to="/legal" className="sp-footer-link">Terms</Link>
                    <Link to="/legal" className="sp-footer-link">Locations</Link>
                    <Link to="/legal" className="sp-footer-link">Language</Link>
                    <Link to="/legal" className="sp-footer-link">Verified</Link>
                </nav>
                
                <div className="flex flex-col gap-2 opacity-50">
                    <a 
                        href="https://www.linkedin.com/in/syedmukheeth" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sp-footer-link flex items-center gap-1.5"
                        style={{ opacity: 1 }}
                    >
                        <FaLinkedin size={12} className="text-[#0A66C2]" />
                        Syed Mukheeth
                    </a>
                    <span className="sp-footer-copyright">
                        © 2026 PEERNET FROM INDIA
                    </span>
                </div>
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
                    data: page.data.map(post => String(post._id) === String(postId) ? { ...post, isLiked: liked, likesCount } : post)
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
                    data: page.data.filter(post => String(post._id) !== String(postId))
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
                    data: page.data.map(post => String(post._id) === String(postId) ? { ...post, ...updated } : post)
                }))
            }
        })
    }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            <div className="l-feed-grid pt-6">

                {/* ── Feed column ───────────── */}
                <div className="l-main-col l-stack">
                    <StoryRail />
                    
                    <div className="l-stack l-stack-lg mt-2">
                        {posts.filter(Boolean).map(post => (
                            <PostCard key={post?._id || post?.id} post={post}
                                onLikeToggle={onLikeToggle}
                                onDelete={onDelete}
                                onUpdate={onUpdate} />
                        ))}
                    </div>

                    {loading && posts.length === 0 && (
                        <div className="l-stack l-stack-lg">
                            <PostSkeleton />
                            <PostSkeleton />
                        </div>
                    )}
                    
                    {loading && posts.length > 0 && (
                        <div className="pt-4">
                            <PostSkeleton />
                        </div>
                    )}

                    {!loading && posts.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="empty-state-premium l-card-premium p-16 text-center"
                        >
                            <div className="empty-state-visual mb-6">
                                <div className="visual-circle">
                                    <span className="text-4xl text-accent">✨</span>
                                </div>
                            </div>
                            <h2 className="t-h2 mb-2 font-bold">Your feed is just beginning</h2>
                            <p className="t-body text-muted mb-8 max-w-sm mx-auto">
                                Follow creators and join communities to see the best of PeerNet right here.
                            </p>
                            <Link to="/search" className="btn btn-primary px-8 py-3 no-underline inline-flex items-center gap-2">
                                Discover People ↗
                            </Link>
                        </motion.div>
                    )}

                    {hasNextPage && !loading && posts.length > 0 && (
                        <div className="flex justify-center py-8">
                            <motion.button className="btn btn-secondary px-8"
                                onClick={() => fetchNextPage()}
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                Load more
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* ── Right panel ───────────── */}
                <aside className="l-side-panel dm-mobile-hidden">
                    <RightPanel />
                </aside>

            </div>
        </motion.div>
    )
}
