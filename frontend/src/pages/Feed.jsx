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

            {/* ── Profile mini card ─────────────── */}
            <div 
                className="l-cluster gap-3 px-1 cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => navigate(`/profile/${user?._id}`)}
            >
                <div className="relative shrink-0">
                    <img src={myAvatar}
                        className="w-[56px] h-[56px] rounded-full object-cover border-2 border-accent p-[2px]"
                        alt="" />
                </div>
                <div className="flex-1 truncate">
                    <div className="l-cluster gap-1 w-full">
                        <span className="t-h3 font-bold truncate">
                            {user?.username}
                        </span>
                        {user?.isVerified && <HiBadgeCheck className="text-accent text-sm shrink-0" />}
                    </div>
                    <div className="t-body truncate opacity-60">
                        {user?.fullName || 'PeerNet user'}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user?._id}`) }}
                    className="text-accent font-bold text-xs hover:text-accent-hover transition-colors"
                >
                    Switch
                </button>
            </div>

            {/* ── Suggested for you ─────────────── */}
            {suggestions.length > 0 && (
                <div className="l-stack">
                    <div className="l-cluster justify-between mb-1">
                        <span className="t-label opacity-60">
                            Suggested for you
                        </span>
                        <Link to="/search" className="t-caption font-bold text-primary no-underline hover:opacity-60">
                            See all
                        </Link>
                    </div>

                    <div className="l-stack l-stack-sm">
                        {suggestions.map(u => {
                            const rawAv = u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            const av = optimizeAvatarUrl(rawAv)
                            const isFollowed = followed[u._id]
                            return (
                                <div key={u._id} className="l-cluster gap-3 py-1">
                                    <Link to={`/profile/${u._id}`} className="shrink-0">
                                        <img src={av} className="w-10 h-10 rounded-full object-cover" alt="" />
                                    </Link>
                                    <div className="flex-1 truncate">
                                        <Link to={`/profile/${u._id}`} className="block text-primary no-underline">
                                            <div className="l-cluster gap-1">
                                                <span className="t-h3 font-bold">{u.username}</span>
                                                {u.isVerified && <HiBadgeCheck className="text-accent text-xs" />}
                                            </div>
                                            <div className="t-caption opacity-60">
                                                Suggested for you
                                            </div>
                                        </Link>
                                    </div>
                                    <button 
                                        onClick={() => handleFollow(u)} 
                                        className={`font-bold text-[12px] shrink-0 transition-colors ${isFollowed ? 'text-muted' : 'text-accent hover:text-accent-hover'}`}
                                    >
                                        {isFollowed ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Footer ───────────────────────── */}
            <div className="pt-4 border-t border-border opacity-40">
                <div className="l-stack l-stack-sm">
                    <a
                        href="https://www.linkedin.com/in/syedmukheeth"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="l-cluster gap-1.5 text-[11px] text-primary no-underline font-bold hover:underline">
                        <FaLinkedin className="text-[#0A66C2]" />
                        Syed Mukheeth
                    </a>
                    <p className="text-[10px] m-0">
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
