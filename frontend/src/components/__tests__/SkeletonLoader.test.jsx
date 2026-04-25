/* global describe, it, expect */
import { render } from '@testing-library/react';
import { PostSkeleton, StorySkeleton } from '../SkeletonLoader';

describe('SkeletonLoader Components', () => {
    describe('PostSkeleton', () => {
        it('should render without crashing', () => {
            const { container } = render(<PostSkeleton />);
            expect(container.querySelector('.sk-card')).toBeInTheDocument();
            expect(container.querySelector('.sk-header')).toBeInTheDocument();
            expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
        });
    });

    describe('StorySkeleton', () => {
        it('should render 8 skeleton items by default', () => {
            const { container } = render(<StorySkeleton />);
            const items = container.querySelectorAll('.sk-story-item');
            expect(items.length).toBe(8);
            expect(container.querySelector('.sk-story-rail')).toBeInTheDocument();
        });
    });
});
