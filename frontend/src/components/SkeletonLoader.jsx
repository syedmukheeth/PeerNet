;
import './SkeletonLoader.css';

export function PostSkeleton() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-header">
                <div className="skeleton-avatar shimmer"></div>
                <div className="skeleton-header-info">
                    <div className="skeleton-text-line shimmer" style={{ width: '120px' }}></div>
                    <div className="skeleton-text-line shimmer" style={{ width: '80px', marginTop: '6px' }}></div>
                </div>
            </div>
            <div className="skeleton-image shimmer"></div>
            <div className="skeleton-footer">
                <div className="skeleton-actions">
                    <div className="skeleton-icon shimmer"></div>
                    <div className="skeleton-icon shimmer"></div>
                    <div className="skeleton-icon shimmer"></div>
                </div>
                <div className="skeleton-text-line shimmer" style={{ width: '60px', marginTop: '12px' }}></div>
                <div className="skeleton-text-line shimmer" style={{ width: '90%', marginTop: '12px' }}></div>
                <div className="skeleton-text-line shimmer" style={{ width: '70%', marginTop: '6px' }}></div>
            </div>
        </div>
    );
}

export function StorySkeleton() {
    return (
        <div className="skeleton-story-rail">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-story-item">
                    <div className="skeleton-story-avatar shimmer"></div>
                    <div className="skeleton-text-line shimmer" style={{ width: '50px', marginTop: '6px' }}></div>
                </div>
            ))}
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="fade-in" style={{ paddingBottom: '40px' }}>
            <div className="skeleton-profile-header">
                <div className="skeleton-circle shimmer" style={{ width: '150px', height: '150px' }}></div>
                <div className="skeleton-profile-info">
                    <div className="skeleton-line shimmer" style={{ width: '40%', height: '24px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '60%', height: '16px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '30%', height: '16px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '80%', height: '14px', marginTop: '10px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '50%', height: '14px' }}></div>
                </div>
            </div>
            {/* Tabs placeholder */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton-line shimmer" style={{ width: '60px', height: '16px' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '60px', height: '16px' }}></div>
            </div>
            {/* Grid */}
            <div className="skeleton-grid" style={{ marginTop: '2px' }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="skeleton-grid-item shimmer"></div>
                ))}
            </div>
        </div>
    );
}

export function GridSkeleton() {
    return (
        <div className="skeleton-grid">
            {[...Array(9)].map((_, i) => (
                <div key={i} className="skeleton-grid-item shimmer"></div>
            ))}
        </div>
    );
}

export function ListItemSkeleton() {
    return (
        <div className="skeleton-list-item">
            <div className="skeleton-circle shimmer" style={{ width: '44px', height: '44px' }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-line shimmer" style={{ width: '60%', height: '14px' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '40%', height: '12px' }}></div>
            </div>
            <div className="skeleton-box shimmer" style={{ width: '60px', height: '30px' }}></div>
        </div>
    );
}

export function PostDetailSkeleton() {
    return (
        <div className="skeleton-post-detail fade-in">
            <div className="skeleton-pd-image shimmer"></div>
            <div className="skeleton-pd-sidebar">
                {/* Header */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' }}>
                    <div className="skeleton-circle shimmer" style={{ width: '32px', height: '32px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '100px', height: '14px' }}></div>
                </div>
                {/* Comments area */}
                <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px' }}>
                            <div className="skeleton-circle shimmer" style={{ width: '32px', height: '32px' }}></div>
                            <div style={{ flex: 1 }}>
                                <div className="skeleton-line shimmer" style={{ width: '80%', height: '14px', marginBottom: '8px' }}></div>
                                <div className="skeleton-line shimmer" style={{ width: '50%', height: '12px' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Input area */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                    <div className="skeleton-line shimmer" style={{ width: '100%', height: '40px', borderRadius: '20px' }}></div>
                </div>
            </div>
        </div>
    );
}

export function ChatListSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...Array(8)].map((_, i) => (
                <ListItemSkeleton key={i} />
            ))}
        </div>
    );
}

export function MessageBubblesSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '4px' }}>
            <div className="skeleton-message-bubble left shimmer" style={{ width: '40%', height: '40px' }}></div>
            <div className="skeleton-message-bubble left shimmer" style={{ width: '60%', height: '60px' }}></div>
            
            <div className="skeleton-message-bubble right shimmer" style={{ width: '50%', height: '40px', marginTop: '16px' }}></div>
            
            <div className="skeleton-message-bubble left shimmer" style={{ width: '30%', height: '40px', marginTop: '16px' }}></div>
            
            <div className="skeleton-message-bubble right shimmer" style={{ width: '70%', height: '80px', marginTop: '16px' }}></div>
            <div className="skeleton-message-bubble right shimmer" style={{ width: '40%', height: '40px' }}></div>
        </div>
    );
}
