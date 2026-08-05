import { useState, useEffect, lazy, Suspense } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import api from '../api/axios'

// Lazy load heavy components
const PostCard = lazy(() => import('../components/PostCard'))
const StoryRail = lazy(() => import('../components/StoryRail'))

import { optimizeAvatarUrl } from '../utils/cloudinary'
import { useAuth } from '../context/AuthContext'
import { HiBadgeCheck, HiCamera } from 'react-icons/hi'
import { FaLinkedin } from 'react-icons/fa'

/* ── Right Panel ─────────────────────────────────────────── */
function RightPanel() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [suggestions, setSuggestions] = useState([])
    const [followed, setFollowed] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }
        setLoading(true)
        api.get('/users/suggestions', { params: { limit: 5 } })
            .then(({ data }) => setSuggestions(data.data || []))
            .catch(() => setSuggestions([]))
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
                    {user?.fullName && <div className="sp-fullname">{user.fullName}</div>}
                </div>
                <button
                    onClick={() => navigate(`/profile/${user?._id}`)}
                    className="sp-action-link"
                >
                    View profile
                </button>
            </div>

            {/* ── Suggestions Section ─────────── */}
            <div className="mt-2">
                <div className="sp-section-header">
                    <span className="sp-section-title">Suggested for you</span>
                    <Link to="/search" className="sp-action-link sp-action-link--muted">See All</Link>
                </div>

                <div className="flex flex-col sp-suggestions-list">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="sp-suggestion-row">
                                <div className="skeleton skeleton-circle w-8 h-8" />
                                <div className="sp-suggestion-info">
                                    <div className="skeleton skeleton-text m h-3" />
                                    <div className="skeleton skeleton-text s h-2" />
                                </div>
                                <div className="skeleton w-12 h-6 rounded-md" />
                            </div>
                        ))
                    ) : suggestions.map((u) => {
                        const av = optimizeAvatarUrl(u.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`)
                        const isFollowed = followed[u._id]
                        const followers = u.followersCount || 0
                        return (
                            <div key={u._id} className="sp-suggestion-row">
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
                                    <div className="sp-suggestion-subtext">
                                        {u.fullName || `${followers} follower${followers === 1 ? '' : 's'}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(u)}
                                    className={`sp-btn-follow text-xs font-bold ${isFollowed ? 'text-muted' : 'text-accent hover:text-accent-hover'}`}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>
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
    const { user } = useAuth()
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
        staleTime: 30_000,
        refetchOnMount: 'always',
        enabled: !!user,
    })

    const isLoading = status === 'pending'
    const posts = data
        ? data.pages.flatMap((page) => (Array.isArray(page?.data) ? page.data : []))
        : []

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
        <div>
            <div className="l-feed-grid">

                {/* ── Feed column ───────────── */}
                <div className="l-main-col l-stack">
                    <div style={{ minHeight: '144px' }}>
                        <Suspense fallback={<div className="h-[144px] w-full" />}>
                            <StoryRail />
                        </Suspense>
                    </div>
                    
                    <div className="feed-posts">
                        <Suspense fallback={null}>
                            {posts.filter(Boolean).map((post) => (
                                <PostCard key={post._id} post={post} onLikeToggle={onLikeToggle} onDelete={onDelete} onUpdate={onUpdate} />
                            ))}
                        </Suspense>

                        {(isLoading || isFetchingNextPage) && (
                            <div className="flex flex-col gap-8 pb-20">
                                {/* Mirrors PostCard's own layout classes so the two cannot drift apart. */}
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="l-post-card" aria-hidden="true">
                                        <div className="post-card-header">
                                            <div className="post-card-user">
                                                <div className="skeleton skeleton-circle shrink-0" style={{ width: 32, height: 32 }} />
                                                <div className="skeleton rounded-full" style={{ width: 140, height: 14 }} />
                                            </div>
                                            <div className="skeleton skeleton-circle" style={{ width: 28, height: 28 }} />
                                        </div>
                                        <div className="skeleton w-full aspect-square rounded-none shrink-0" />
                                        <div className="post-card-actions">
                                            <div className="post-card-actions-left">
                                                <div className="skeleton rounded-md" style={{ width: 26, height: 26 }} />
                                                <div className="skeleton rounded-md" style={{ width: 24, height: 24 }} />
                                                <div className="skeleton rounded-md" style={{ width: 22, height: 22 }} />
                                            </div>
                                            <div className="skeleton rounded-md" style={{ width: 24, height: 24 }} />
                                        </div>
                                        <div className="post-card-footer">
                                            <div className="flex items-center" style={{ height: 22, marginBottom: 2 }}>
                                                <div className="skeleton rounded-full" style={{ width: 96, height: 12 }} />
                                            </div>
                                            <div className="flex items-center" style={{ height: 20 }}>
                                                <div className="skeleton rounded-full w-full" style={{ height: 12 }} />
                                            </div>
                                            <div className="flex items-center" style={{ height: 22, marginTop: 2 }}>
                                                <div className="skeleton rounded-full" style={{ width: 150, height: 12 }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isLoading && posts.length === 0 && (
                            <div className="feed-empty">
                                <div className="feed-empty__icon">
                                    <HiCamera size={28} />
                                </div>
                                <h2 className="feed-empty__title">No posts yet</h2>
                                <p className="feed-empty__text">
                                    Posts from people you follow show up here. Find some accounts to follow to get started.
                                </p>
                                <Link to="/search" className="btn btn-primary no-underline">
                                    Find people to follow
                                </Link>
                            </div>
                        )}

                        {hasNextPage && !isLoading && posts.length > 0 && (
                            <div className="flex justify-center py-8">
                                <button className="btn btn-secondary px-8" onClick={() => fetchNextPage()}>
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right panel ───────────── */}
                <aside className="l-side-panel">
                    <RightPanel />
                </aside>

            </div>
        </div>
    )
}
