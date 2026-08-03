import cx from './cx'

const TONES = {
    neutral: '',
    accent: 'badge-accent',
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
}

export default function Badge({ tone = 'neutral', className, children, ...rest }) {
    return (
        <span className={cx('badge', TONES[tone], className)} {...rest}>
            {children}
        </span>
    )
}
