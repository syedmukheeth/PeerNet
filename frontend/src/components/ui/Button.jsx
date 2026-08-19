import cx from './cx'

/*
 * Wraps the existing .btn family in index.css. It does not replace or rename a
 * single class, so untouched markup keeps working exactly as before and only
 * new code has to go through this component.
 */

const VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    subtle: 'btn-subtle',
    danger: 'btn-danger',
}

const SIZES = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    icon: 'btn-icon',
    iconSm: 'btn-icon-sm',
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    as: Tag = 'button',
    className,
    children,
    disabled,
    ...rest
}) {
    return (
        <Tag
            className={cx(
                'btn',
                VARIANTS[variant] || VARIANTS.primary,
                SIZES[size],
                loading && 'btn-loading',
                fullWidth && 'btn-block',
                className,
            )}
            disabled={Tag === 'button' ? disabled || loading : undefined}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
            {children}
        </Tag>
    )
}
