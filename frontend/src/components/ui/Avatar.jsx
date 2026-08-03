import cx from './cx'
import avatarFallback from './avatarFallback'

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 80, '2xl': 150 }

export default function Avatar({
    src,
    name,
    size = 'md',
    ring = false,
    className,
    ...rest
}) {
    const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md
    return (
        <img
            src={src || avatarFallback(name)}
            alt={name ? `${name}'s avatar` : ''}
            width={px}
            height={px}
            loading="lazy"
            className={cx('avatar', ring && 'avatar-ring', className)}
            style={{ width: px, height: px }}
            {...rest}
        />
    )
}
