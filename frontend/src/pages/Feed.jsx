import { useState, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import PostCard from '../components/PostCard'
import StoryRail from '../components/StoryRail'

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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        setLoading(true)
        api.get('/users/search', { params: { q: 'a', limit: 6 } })
            .then(({ data }) => {
                const others = (data.data || []).filter(u => u._id !== user._id)
                setSuggestions(others.slice(0, 5))
            })
            .catch(() => { })
            .finally(() => setLoading(false))
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
            <div className="mt-2">
                <div className="sp-section-header">
                    <span className="sp-section-title">Suggested for you</span>
                    <Link to="/search" className="sp-action-link sp-action-link--muted">See All</Link>
                </div>

                <div className="flex flex-col">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="sp-suggestion-row opacity-50">
                                <div className="skeleton skeleton-circle w-8 h-8" />
                                <div className="sp-suggestion-info">
                                    <div className="skeleton skeleton-text m h-3" />
                                    <div className="skeleton skeleton-text s h-2 opacity-50" />
                                </div>
                                <div className="skeleton w-12 h-6 rounded-md" />
                            </div>
                        ))
                    ) : suggestions.map((u, idx) => {
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
                                <div className="sp-suggestion-info ml-1">
                                     <div 
                                         className="sp-suggestion-username cursor-pointer hover:underline"
                                         onClick={() => navigate(`/profile/${u._id}`)}
                                     >
                                         {u.username}
                                         {u.isVerified && <HiBadgeCheck className="text-accent" />}
                                     </div>
                                     <div className="sp-suggestion-subtext text-[11px] opacity-60">PeerNet Recommended</div>
                                 </div>
                                 <button 
                                     onClick={() => handleFollow(u)} 
                                     className={`sp-btn-follow text-xs font-bold ${isFollowed ? 'text-muted' : 'text-accent hover:text-accent-hover'}`}
                                 >
                                     {isFollowed ? 'Following' : 'Follow'}
                                 </button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* ── Aesthetic Sidebar Footer ──────────────── */}
            <div className="sp-footer">
                <div className="flex flex-col gap-3">
                    <a 
                        href="https://www.linkedin.com/in/syedmukheeth" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sp-developer-link"
                    >
                        <FaLinkedin size={14} className="text-[#0A66C2]" />
                        <span>Developed by Syed Mukheeth</span>
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
            <div className="l-feed-grid md:pt-6">

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

                    {loading && (
                        <div key="feed-skeleton" className="l-stack l-stack-lg pt-4 px-2">
                            {[1, 2].map(id => (
                                <div key={id} className="l-card-premium p-4 space-y-4 border border-white/5 overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="skeleton size-10 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <div className="skeleton h-4 w-32" />
                                            <div className="skeleton h-3 w-24 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="skeleton w-full aspect-[4/5] rounded-xl" />
                                    <div className="space-y-2.5">
                                        <div className="skeleton skeleton-text l" />
                                        <div className="skeleton skeleton-text m" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}


                    {!loading && posts.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="empty-state-premium bg-surface-el/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-16 text-center shadow-2xl"
                        >
                            <div className="empty-state-visual mb-8">
                                <div className="visual-circle w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto border border-accent/20">
                                    <span className="text-5xl animate-bounce">✨</span>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black mb-3 tracking-tight">Your feed is waiting...</h2>
                            <p className="text-muted text-[15px] mb-10 max-w-sm mx-auto leading-relaxed">
                                Join the community, follow your peers, and start your journey on PeerNet today.
                            </p>
                            <Link to="/search" className="btn btn-primary px-10 py-3.5 rounded-2xl font-bold no-underline inline-flex items-center gap-2 shadow-lg shadow-accent/20">
                                Discover Creators ↗
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
