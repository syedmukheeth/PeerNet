/*
 * A 30-day line for one real series.
 *
 * The chart this replaces drew a fixed decorative curve
 * ("0,250 Q100,220 200,240 T400,180 ...") whenever its data was missing, which
 * was always, because it read a key the endpoint does not return. A chart with
 * no data now says so instead of drawing a shape.
 *
 * `data` is the backend's padded shape: [{ date: '2026-08-19', count: 4 }, ...]
 * Every one of the 30 days is present, zeros included.
 */
export default function TrendChart({ data = [], label = 'Series' }) {
    const points = data.filter(d => d && typeof d.count === 'number')

    if (points.length < 2) {
        return (
            <div className="ac-empty">
                <div className="ac-empty-title">Not enough history yet</div>
                <p className="ac-empty-text">
                    This chart needs at least two days of activity before it can draw a trend.
                </p>
            </div>
        )
    }

    const W = 1000
    const H = 260
    const PAD_B = 24
    const PAD_T = 12

    const max = Math.max(...points.map(p => p.count), 1)
    const plotH = H - PAD_B - PAD_T

    const coords = points.map((p, i) => {
        const x = (i / (points.length - 1)) * W
        const y = PAD_T + plotH - (p.count / max) * plotH
        return [x, y]
    })

    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
    const area = `${line} L ${W} ${H - PAD_B} L 0 ${H - PAD_B} Z`

    const total = points.reduce((sum, p) => sum + p.count, 0)
    const first = points[0]?.date
    const last = points[points.length - 1]?.date

    return (
        <>
            <div className="ac-chart">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
                    aria-label={`${label}: ${total} over ${points.length} days`}>
                    {[0, 0.5, 1].map(t => {
                        const y = PAD_T + plotH * t
                        return <line key={t} className="ac-chart-grid" x1="0" y1={y} x2={W} y2={y} />
                    })}
                    <path className="ac-chart-area" d={area} />
                    <path className="ac-chart-line" d={line} vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            <div className="ac-legend">
                <span className="ac-legend-key">
                    <span className="ac-legend-dot" />
                    {label}
                </span>
                <span className="ac-muted">
                    {total.toLocaleString()} total, peak {max.toLocaleString()} in a day
                </span>
                <span className="ac-muted">
                    {formatDay(first)} to {formatDay(last)}
                </span>
            </div>
        </>
    )
}

function formatDay(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
