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
        <div className="l-stack l-stack-lg">

            {/* ── Profile Premium Card ─────────────── */}
            <div 
                className="l-card-premium p-4 cursor-pointer group"
                onClick={() => navigate(`/profile/${user?._id}`)}
            >
                <div className="l-cluster gap-4">
                    <div className="relative shrink-0">
                        <img src={myAvatar}
                            className="w-12 h-12 avatar ring-2 ring-accent/20 p-[0.5px] transition-transform group-hover:scale-105"
                            alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="l-cluster gap-1.5 w-full">
                            <span className="t-h3 font-bold truncate text-primary group-hover:text-accent transition-colors">
                                {user?.username}
                            </span>
                            {user?.isVerified && <HiBadgeCheck className="text-accent text-sm shrink-0" />}
                        </div>
                        <div className="t-caption truncate opacity-50">
                            {user?.fullName || 'PeerNet Creator'}
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user?._id}`) }}
                        className="btn btn-ghost btn-sm text-accent hover:bg-accent-subtle transition-all font-bold px-3 py-1.5"
                    >
                        Switch
                    </button>
                </div>
            </div>

            {/* ── Suggested for you ─────────────── */}
            {suggestions.length > 0 && (
                <div className="l-stack">
                    <div className="l-cluster justify-between mb-4 px-1">
                        <span className="t-label opacity-60 font-black tracking-[0.15em]">
                            Global_Registry
                        </span>
                        <Link to="/search" className="t-caption font-black text-accent no-underline hover:brightness-125 transition-all">
                            EXPLORE_ALL
                        </Link>
                    </div>

                    <div className="l-stack l-stack-sm">
                        {suggestions.map((u, idx) => {
                            const rawAv = u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            const av = optimizeAvatarUrl(rawAv)
                            const isFollowed = followed[u._id]
                            return (
                                <motion.div 
                                    key={u._id} 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx, type: 'spring', damping: 20 }}
                                    className="l-cluster gap-4 p-3 rounded-2xl hover:bg-surface/50 border border-transparent hover:border-border/30 transition-all group"
                                >
                                    <Link to={`/profile/${u._id}`} className="shrink-0 relative">
                                        <img src={av} className="w-11 h-11 rounded-xl object-cover shadow-lg border border-border/20 group-hover:scale-105 transition-transform" alt="" />
                                        {isFollowed && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-surface animate-pulse" />
                                        )}
                                    </Link>
                                    <div className="flex-1 truncate">
                                        <Link to={`/profile/${u._id}`} className="block text-primary no-underline">
                                            <div className="l-cluster gap-1.5 mb-0.5">
                                                <span className="t-h3 font-black tracking-tight">{u.username.toUpperCase()}</span>
                                                {u.isVerified && <HiBadgeCheck className="text-accent text-sm" />}
                                            </div>
                                            <div className="t-caption opacity-40 font-bold uppercase text-[9px] tracking-widest">
                                                Active_Node
                                            </div>
                                        </Link>
                                    </div>
                                    <button 
                                        onClick={() => handleFollow(u)} 
                                        className={`h-8 px-4 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all ${isFollowed ? 'bg-surface text-text-3 border border-border/40' : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white'}`}
                                    >
                                        {isFollowed ? 'Following' : 'Connect'}
                                    </button>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Professional Footer ───────────────────────── */}
            <div className="pt-6 border-t border-border-md">
                <div className="l-stack gap-3">
                    <div className="l-cluster gap-4 opacity-40 hover:opacity-100 transition-opacity">
                        <a
                            href="https://www.linkedin.com/in/syedmukheeth"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="l-cluster gap-1.5 text-[11px] text-primary no-underline font-bold hover:text-accent transition-colors">
                            <FaLinkedin className="text-[#0A66C2]" size={14} />
                            Syed Mukheeth
                        </a>
                        <Link to="/legal" className="text-[11px] text-primary no-underline font-medium hover:underline">Privacy</Link>
                        <Link to="/legal" className="text-[11px] text-primary no-underline font-medium hover:underline">Terms</Link>
                    </div>
                    <p className="text-[10px] m-0 opacity-30 font-medium tracking-wider uppercase">
                        Built with Passion in India · © 2026 PeerNet
                    </p>
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
