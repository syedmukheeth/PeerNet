import cx from './cx'

export default function EmptyState({ icon, title, description, action, className }) {
    return (
        <div className={cx('empty-state', className)}>
            {icon && <div className="empty-state-icon">{icon}</div>}
            {title && <h3 className="empty-state-title">{title}</h3>}
            {description && <p className="empty-state-text">{description}</p>}
            {action && <div className="empty-state-action">{action}</div>}
        </div>
    )
}
