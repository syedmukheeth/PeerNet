import React from 'react';
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
