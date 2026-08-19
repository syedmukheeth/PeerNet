import { useCallback } from 'react'
import { useOutletContext } from 'react-router'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'
import Metric from '../Metric'

/*
 * Everything on this screen is a real process measurement.
 *
 * The socket pushes infrastructure_pulse every 5s, but only while an admin is
 * in the admin:infrastructure room, and the first frame can be up to 5s away.
 * GET /admin/stats returns the same shape, so it fills the screen immediately
 * and the socket takes over from there.
 *
 * Removed: a "CPU Load 24.0%" bar, which was a `useState(pulse?.load || 24)`
 * initialiser the backend never sends a `load` field for, so it was frozen at
 * 24 forever; and three System Registry rows reading "Database Status: Online",
 * "Chat Connection: Active" and "Activity Log: Recording", all three literal
 * strings that would have said the same thing with the database down.
 */
export default function HealthScreen() {
    const { pulse } = useOutletContext()

    const load = useCallback(async () => {
        const { data } = await adminApi.getStats()
        return data.data
    }, [])

    const { data: snapshot, loading } = useAdminData(load, 'Could not load system metrics')

    // The socket frame wins once it arrives; both carry the same shape.
    const live = pulse || snapshot
    const system = live?.system

    return (
        <div className="ac-stack">
            <div className="ac-grid">
                <Metric loading={loading && !live} icon="server" label="Heap allocated"
                    value={system?.heapUsed || '--'} sub="Node.js process" />
                <Metric loading={loading && !live} icon="bolt" label="Event loop delay"
                    value={typeof pulse?.latency === 'number' ? `${pulse.latency} ms` : '--'}
                    alert={pulse?.latency > 100}
                    sub={pulse ? 'Mean since last frame' : 'Waiting for first frame'} />
                <Metric loading={loading && !live} icon="globe" label="Connected sockets"
                    value={typeof pulse?.connectedClients === 'number' ? pulse.connectedClients : '--'}
                    sub="Live clients" />
                <Metric loading={loading && !live} icon="clock" label="Uptime"
                    value={formatUptime(system?.uptime)} sub="Since last restart" />
            </div>

            <section className="ac-panel">
                <div className="ac-panel-head">
                    <div>
                        <div className="ac-panel-title">Process</div>
                        <div className="ac-panel-sub">
                            {pulse
                                ? `Live, updated ${new Date(pulse.timestamp).toLocaleTimeString()}`
                                : 'Snapshot, waiting for the live feed'}
                        </div>
                    </div>
                    <span className={`ac-badge ${pulse ? 'is-good' : ''}`}>
                        {pulse ? 'Streaming' : 'Snapshot'}
                    </span>
                </div>
                <div className="ac-panel-body">
                    <div className="ac-rows">
                        <Row label="CPU time consumed" value={system?.cpuSeconds ? `${system.cpuSeconds}s` : '--'} />
                        <Row label="Users" value={fmt(live?.userCount)} />
                        <Row label="Posts" value={fmt(live?.postCount)} />
                        <Row label="Stories" value={fmt(live?.storyCount)} />
                        <Row label="Videos" value={fmt(live?.videoCount)} />
                        <Row label="Open feedback" value={fmt(live?.openFeedback)} />
                        {/* Weighted from content counts server side, not metered
                            at the CDN, so it is labelled as an estimate. */}
                        <Row label="Estimated bandwidth" value={live?.bandwidthUsage || '--'} />
                    </div>
                </div>
            </section>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div className="ac-row">
            <span className="ac-row-label">{label}</span>
            <span className="ac-row-value">{value}</span>
        </div>
    )
}

function formatUptime(seconds) {
    const s = Number(seconds)
    if (!Number.isFinite(s)) return '--'
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (d) return `${d}d ${h}h`
    if (h) return `${h}h ${m}m`
    return `${m}m ${Math.floor(s % 60)}s`
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '--')
