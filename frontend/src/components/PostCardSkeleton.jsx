import Skeleton from './ui/Skeleton'

/*
 * The loading placeholder for a post.
 *
 * This lived inline in Feed.jsx, and it is the pattern the rest of the app's
 * skeletons are now built on: it renders PostCard's own wrapper classes
 * (l-post-card, post-card-header, post-card-actions, post-card-footer) and only
 * swaps the leaves. Padding, gaps and row heights therefore come from the same
 * CSS as the loaded card and cannot drift from it.
 *
 * It moved out of Feed so the two Suspense boundaries there can use it as well.
 * Both were `fallback={null}`, so between the query resolving and the lazy
 * PostCard chunk arriving the feed column rendered nothing at all.
 */
export default function PostCardSkeleton() {
    return (
        <div className="l-post-card" aria-hidden="true">
            <div className="post-card-header">
                <div className="post-card-user">
                    <Skeleton w={36} h={36} circle className="shrink-0" />
                    <Skeleton w={140} h={14} radius="var(--r-full)" />
                </div>
                <Skeleton w={32} h={32} radius="var(--r-sm)" />
            </div>

            {/* 4:5 rather than square. Real media is height:auto up to 75vh, and
                portrait is the common case on a social feed, so a square block
                guaranteed a jump on almost every post. */}
            <Skeleton className="w-full shrink-0" style={{ aspectRatio: '4 / 5', borderRadius: 0 }} />

            <div className="post-card-actions">
                <div className="post-card-actions-left">
                    <Skeleton w={40} h={40} radius="var(--r-sm)" />
                    <Skeleton w={40} h={40} radius="var(--r-sm)" />
                    <Skeleton w={40} h={40} radius="var(--r-sm)" />
                </div>
                <Skeleton w={40} h={40} radius="var(--r-sm)" />
            </div>

            <div className="post-card-footer">
                <div className="flex items-center" style={{ height: 22, marginBottom: 2 }}>
                    <Skeleton w={96} h={12} radius="var(--r-full)" />
                </div>
                <div className="flex items-center" style={{ height: 20 }}>
                    <Skeleton h={12} radius="var(--r-full)" className="w-full" />
                </div>
                <div className="flex items-center" style={{ height: 22, marginTop: 2 }}>
                    <Skeleton w={150} h={12} radius="var(--r-full)" />
                </div>
            </div>
        </div>
    )
}

export function PostFeedSkeleton({ count = 3 }) {
    return (
        <div className="flex flex-col gap-8 pb-20" aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
                <PostCardSkeleton key={i} />
            ))}
        </div>
    )
}
