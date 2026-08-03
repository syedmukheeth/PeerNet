import cx from './cx'

export default function Skeleton({ w, h, radius, circle = false, lines = 0, className, style, ...rest }) {
    if (lines > 0) {
        return (
            <div className={cx('skeleton-stack', className)} {...rest}>
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

    return (
        <div
            className={cx('skeleton', circle && 'skeleton-circle', className)}
            style={{ width: w, height: h, borderRadius: circle ? '50%' : radius, ...style }}
            {...rest}
        />
    )
}
