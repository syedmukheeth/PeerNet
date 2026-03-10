import React from 'react';
import { render } from '@testing-library/react';
import { PostSkeleton, StorySkeleton } from '../SkeletonLoader';

describe('SkeletonLoader Components', () => {
    describe('PostSkeleton', () => {
        it('should render without crashing', () => {
            const { container } = render(<PostSkeleton />);
            expect(container.querySelector('.shimmer')).toBeInTheDocument();
            expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
            expect(container.querySelector('.skeleton-header')).toBeInTheDocument();
        });
    });

    describe('StorySkeleton', () => {
        it('should render 6 skeleton items by default', () => {
            const { container } = render(<StorySkeleton />);
            const items = container.querySelectorAll('.skeleton-story-item');
            expect(items.length).toBe(6);
            expect(container.querySelector('.skeleton-story-rail')).toBeInTheDocument();
        });
    });
});
