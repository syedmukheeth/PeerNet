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
        <div className="flex-col gap-4">

            {/* ── Profile mini card ─────────────── */}
            <div 
                className="flex items-center gap-3 px-1 hover:scale-[1.02] cursor-pointer mb-1 transition-transform"
                onClick={() => navigate(`/profile/${user?._id}`)}
            >
                <div className="relative shrink-0">
                    <img src={myAvatar}
                        className="w-[52px] h-[52px] rounded-full object-cover border-2 border-accent p-[2px]"
                        alt="" />
                </div>
                <div className="flex-1 truncate">
                    <div className="flex items-center gap-1 w-full">
                        <span className="font-extrabold text-[13.5px] text-primary truncate">
                            {user?.username}
                        </span>
                        {user?.isVerified && <HiBadgeCheck className="text-accent text-[14px] shrink-0" />}
                    </div>
                    <div className="text-[13px] text-secondary font-medium mt-1 truncate opacity-80">
                        {user?.fullName || 'PeerNet user'}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user?._id}`) }}
                    className="btn btn-xs rounded-full py-1.5 px-3.5 border border-border-md bg-hover font-bold shrink-0"
                >
                    Switch
                </button>
            </div>

            {/* ── Suggested for you ─────────────── */}
            {suggestions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[13px] font-bold text-muted uppercase tracking-wider">
                            Suggested for you
                        </span>
                        <Link to="/search" className="text-[12px] font-bold text-primary hover:text-accent transition-colors">
                            See all
                        </Link>
                    </div>
                    <div className="flex-col gap-4">
                        {suggestions.map(u => {
                            const rawAv = u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            const av = optimizeAvatarUrl(rawAv)
                            const isFollowed = followed[u._id]
                            return (
                                <div key={u._id} className="flex items-center gap-3">
                                    <Link to={`/profile/${u._id}`} className="shrink-0">
                                        <img src={av} className="w-10 h-10 rounded-full object-cover" alt="" />
                                    </Link>
                                    <div className="flex-1 truncate">
                                        <Link to={`/profile/${u._id}`} className="block text-primary">
                                            <div className="flex items-center gap-1 font-semibold text-[13px]">
                                                {u.username}
                                                {u.isVerified && <HiBadgeCheck className="text-accent text-[12px]" />}
                                            </div>
                                            <div className="text-[12px] text-muted mt-0.5">
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
            <div className="px-4 mt-1">
                <div className="border-t border-border pt-4 flex-col gap-1.5">
                    <a
                        href="https://www.linkedin.com/in/syedmukheeth"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12.5px] text-accent font-extrabold hover:brightness-110 transition-all">
                        <FaLinkedin className="text-[13px] text-[#0A66C2]" />
                        Syed Mukheeth
                    </a>
                    <p className="text-[10.5px] text-muted m-0 leading-relaxed">
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
            <div className="feed-layout">

                {/* ── Feed column ───────────── */}
                <div className="feed-col">
                    <StoryRail />
                    <div className="flex-col gap-5 mt-5">
                        {posts.filter(Boolean).map(post => (
                            <PostCard key={post?._id || post?.id} post={post}
                                onLikeToggle={onLikeToggle}
                                onDelete={onDelete}
                                onUpdate={onUpdate} />
                        ))}
                    </div>
                    {loading && posts.length === 0 && (
                        <div className="flex-col gap-4">
                            <PostSkeleton />
                            <PostSkeleton />
                            <PostSkeleton />
                        </div>
                    )}
                    {loading && posts.length > 0 && (
                        <div className="flex-col gap-4 pt-4">
                            <PostSkeleton />
                        </div>
                    )}
                    {!loading && posts.length === 0 && (
                        <div className="empty-state">
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
