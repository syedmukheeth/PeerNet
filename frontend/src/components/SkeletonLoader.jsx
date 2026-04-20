import './SkeletonLoader.css';

export function PostSkeleton() {
    return (
        <div className="sk-card">
            <div className="sk-header">
                <div className="skeleton sk-avatar-lg sk-circle"></div>
                <div className="sk-body flex-1">
                    <div className="skeleton sk-line sk-line-short"></div>
                    <div className="skeleton sk-line sk-line-mid mt-1"></div>
                </div>
            </div>
            <div className="skeleton sk-image sk-rect"></div>
            <div className="sk-body">
                <div className="skeleton sk-line sk-line-long"></div>
                <div className="skeleton sk-line sk-line-mid"></div>
            </div>
        </div>
    );
}

export const PostDetailSkeleton = PostSkeleton;

export function StorySkeleton() {
    return (
        <div className="sk-story-rail">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="sk-story-item">
                    <div className="skeleton sk-story-avatar"></div>
                    <div className="skeleton sk-line sk-line-short"></div>
                </div>
            ))}
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="p-6">
            <div className="flex gap-8 mb-8 items-center">
                <div className="skeleton sk-circle" style={{ width: '150px', height: '150px' }}></div>
                <div className="sk-body flex-1">
                    <div className="skeleton sk-line sk-line-short h-6"></div>
                    <div className="skeleton sk-line sk-line-long mt-4"></div>
                    <div className="skeleton sk-line sk-line-mid"></div>
                </div>
            </div>
            <div className="sk-grid">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="skeleton sk-grid-item"></div>
                ))}
            </div>
        </div>
    );
}

export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-border">
            <div className="skeleton sk-avatar-sm sk-circle"></div>
            <div className="sk-body flex-1">
                <div className="skeleton sk-line sk-line-mid"></div>
                <div className="skeleton sk-line sk-line-short h-2"></div>
            </div>
            <div className="skeleton sk-rect" style={{ width: '60px', height: '32px' }}></div>
        </div>
    );
}

export function GridSkeleton() {
    return (
        <div className="sk-grid">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="skeleton sk-grid-item"></div>
            ))}
        </div>
    );
}

export function ChatListSkeleton() {
    return (
        <div className="flex flex-col">
            {[...Array(10)].map((_, i) => (
                <ListItemSkeleton key={i} />
            ))}
        </div>
    );
}
