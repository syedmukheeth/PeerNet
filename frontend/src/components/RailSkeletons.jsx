import Skeleton from './ui/Skeleton'

/*
 * Placeholders for the two lazily loaded rails on the feed.
 *
 * They live here rather than inside StoryRail and RightPanel because importing
 * them from those modules would pull the very chunks they exist to stand in
 * for, undoing the code split. They are deliberately tiny for the same reason.
 *
 * Both boundaries previously rendered nothing: the story rail got an empty
 * 144px box, and the right panel `fallback={null}`, so the entire aside was
 * blank until its chunk landed.
 */

export function StoryRailSkeleton({ count = 8 }) {
    return (
        <div className="story-rail-wrap" aria-busy="true">
            <div className="story-rail">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="story-item">
                        <div className="relative w-[76px] h-[76px]">
                            <Skeleton className="w-full h-full" circle />
                        </div>
                        <Skeleton w={56} h={12} radius="var(--r-full)" className="mt-2 opacity-30" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function SuggestionsSkeleton({ count = 5 }) {
    return (
        <div className="sp-container" aria-busy="true">
            <div className="sp-section-header">
                <Skeleton h={13} w={128} radius="var(--r-xs)" />
            </div>
            <div className="flex flex-col sp-suggestions-list">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="sp-suggestion-row">
                        <Skeleton w={34} h={34} circle />
                        <div className="sp-suggestion-info ml-1">
                            <Skeleton h={12} w="60%" radius="var(--r-xs)" />
                            <Skeleton h={10} w="35%" radius="var(--r-xs)" style={{ marginTop: 6 }} />
                        </div>
                        <Skeleton w={48} h={24} radius="var(--r-sm)" />
                    </div>
                ))}
            </div>
        </div>
    )
}
