import cx from './cx'

export default function Card({ variant = 'solid', as: Tag = 'div', className, children, ...rest }) {
    return (
        <Tag className={cx(variant === 'glass' ? 'glass-card' : 'card', className)} {...rest}>
            {children}
        </Tag>
    )
}
