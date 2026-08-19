import { Icon } from '../../components/ui/icons'

/*
 * A number and what it counts. The card this replaced was 32px of padding
 * around a weight-900 value, a rotating icon tile, a glow shadow and a lift on
 * hover, and half the numbers it displayed were literals.
 */
export default function Metric({ icon, label, value, sub, alert, loading }) {
    if (loading) {
        return (
            <div className="ac-metric">
                <div className="skeleton" style={{ height: 16, width: '55%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 30, width: '40%', borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 13, width: '65%', borderRadius: 6, opacity: 0.5 }} />
            </div>
        )
    }

    return (
        <div className={`ac-metric ${alert ? 'is-alert' : ''}`}>
            <div className="ac-metric-label">
                {icon && <Icon name={icon} size={15} />}
                {label}
            </div>
            <div className="ac-metric-value">{value}</div>
            {sub && <div className="ac-metric-sub">{sub}</div>}
        </div>
    )
}
