import cx from './cx'

/*
 * The loading placeholder primitive.
 *
 * This existed and was exported from the barrel for a long time without a
 * single import: all 83 placeholders in the app were hand-rolled inline, in
 * three different conventions, and every one of them drifted from the layout it
 * was standing in for. Anything that loads should build its skeleton from this.
 *
 * The rule for composing one: render the REAL component's wrapper classes and
 * only swap the leaves for <Skeleton>. That way padding, gap and row rhythm
 * come from the same CSS as the loaded state and cannot fall out of step. See
 * PostCardSkeleton for the shape to copy.
 *
 * Skeletons are decorative. They are aria-hidden, and the container that is
 * actually loading should carry aria-busy so a screen reader is told once that
 * something is in flight rather than reading out a wall of empty boxes.
 */
export default function Skeleton({ w, h, radius, circle = false, className, style, ...rest }) {
    return (
        <div
            className={cx('skeleton', circle && 'skeleton-circle', className)}
            style={{ width: w, height: h, borderRadius: circle ? '50%' : radius, ...style }}
            aria-hidden="true"
            {...rest}
        />
    )
}

/*
 * A paragraph of placeholder lines.
 *
 * This used to be a `lines` prop on Skeleton itself, which silently ignored
 * w, h, radius, circle and style whenever it was set - a prop set that lied
 * about what it accepted. It is its own component instead.
 */
export function SkeletonText({ lines = 3, className, style, ...rest }) {
    return (
        <div className={cx('skeleton-stack', className)} style={style} aria-hidden="true" {...rest}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton skeleton-text"
                    // Last line short, the way real wrapped text ends.
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    )
}
