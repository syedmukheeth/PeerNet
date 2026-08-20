import { useCallback, lazy, Suspense } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import api from '../api/axios'

// Lazy load heavy components
const PostCard = lazy(() => import('../components/PostCard'))
const StoryRail = lazy(() => import('../components/StoryRail'))
const RightPanel = lazy(() => import('../components/shell/RightPanel'))

import { useAuth } from '../context/AuthContext'
import { HiCamera, HiExclamationCircle } from '../components/ui/icons'
import { PostFeedSkeleton } from '../components/PostCardSkeleton'
import { StoryRailSkeleton, SuggestionsSkeleton } from '../components/RailSkeletons'

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
        refetch,
    } = useInfiniteQuery({
        queryKey: ['feed'],
        queryFn: async ({ pageParam = null }) => {
            // No _t cache-buster. Combined with refetchOnMount: 'always' it made
            // staleTime and the whole React Query cache inert: every mount was a
            // cold network round-trip, and every navigation back to the feed
            // threw away data it already had. Freshness comes from invalidation
            // on write instead.
            const params = { limit: 10 }
            if (pageParam) params.cursor = pageParam
            const res = await api.get('/posts/feed', { params })
            return res.data
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
        staleTime: 30_000,
        enabled: !!user,
    })

    const isLoading = status === 'pending'
    const isError = status === 'error'
    const posts = data
        ? data.pages.flatMap((page) => (Array.isArray(page?.data) ? page.data : []))
        : []

    // useCallback, so the identity is stable across renders. PostCard is
    // memoised, and fresh closures here would defeat that: every card in the
    // feed re-rendered on any feed state change, each one carrying an
    // IntersectionObserver and possibly a video element.
    const onLikeToggle = useCallback((postId, liked, likesCount) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: (page.data ?? []).map(post => String(post._id) === String(postId) ? { ...post, isLiked: liked, likesCount } : post)
                }))
            }
        })
    }, [queryClient])

    const onDelete = useCallback((postId) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: (page.data ?? []).filter(post => String(post._id) !== String(postId))
                }))
            }
        })
    }, [queryClient])

    const onUpdate = useCallback((postId, updated) => {
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    data: (page.data ?? []).map(post => String(post._id) === String(postId) ? { ...post, ...updated } : post)
                }))
            }
        })
    }, [queryClient])

    return (
        <div>
            <div className="l-feed-grid">

                {/* ── Feed column ───────────── */}
                <div className="l-main-col l-stack">
                    <div style={{ minHeight: '144px' }}>
                        <Suspense fallback={<StoryRailSkeleton />}>
                            <StoryRail />
                        </Suspense>
                    </div>
                    
                    <div className="feed-posts">
                        {/* Was fallback={null}: the feed column rendered nothing
                            between the query resolving and the lazy PostCard
                            chunk arriving. */}
                        <Suspense fallback={<PostFeedSkeleton count={2} />}>
                            {posts.filter(Boolean).map((post) => (
                                <PostCard key={post._id} post={post} onLikeToggle={onLikeToggle} onDelete={onDelete} onUpdate={onUpdate} />
                            ))}
                        </Suspense>

                        {(isLoading || isFetchingNextPage) && <PostFeedSkeleton />}

                        {/* A failed request used to fall through to the empty
                            state below, so "the server is down" and "you follow
                            nobody" looked identical and neither offered a retry. */}
                        {isError && (
                            <div className="feed-empty" role="alert">
                                <div className="feed-empty__icon">
                                    <HiExclamationCircle size={28} />
                                </div>
                                <h2 className="feed-empty__title">We could not load your feed</h2>
                                <p className="feed-empty__text">
                                    Something went wrong reaching PeerNet. Check your connection and try again.
                                </p>
                                <button className="btn btn-primary" onClick={() => refetch()}>
                                    Try again
                                </button>
                            </div>
                        )}

                        {!isLoading && !isError && posts.length === 0 && (
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
                                <button className="btn btn-secondary" onClick={() => fetchNextPage()}>
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right panel ───────────── */}
                <aside className="l-side-panel">
                    <Suspense fallback={<SuggestionsSkeleton />}>
                        <RightPanel />
                    </Suspense>
                </aside>

            </div>
        </div>
    )
}
