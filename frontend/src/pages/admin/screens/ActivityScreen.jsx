import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '../../../components/ui/icons'
import Button from '../../../components/ui/Button'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'

export default function ActivityScreen() {
    const [search, setSearch] = useState('')

    const load = useCallback(async () => {
        const { data } = await adminApi.getLogs()
        return data.logs || []
    }, [])

    const { data: logs, loading } = useAdminData(load, 'Could not load the activity log')

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return logs || []
        return (logs || []).filter(l =>
            (l.action || '').toLowerCase().includes(q) ||
            (l.details || '').toLowerCase().includes(q) ||
            (l.adminId?.username || '').toLowerCase().includes(q)
        )
    }, [logs, search])

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `peernet-activity-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        // The URL was never revoked and the anchor never removed, so every
        // export leaked the full log payload for the life of the page.
        URL.revokeObjectURL(url)
        a.remove()
        toast.success('Activity log exported')
    }

    return (
        <section className="ac-panel">
            <div className="ac-toolbar">
                <div className="field field-sm">
                    <Icon name="search" size={16} className="field-icon" />
                    <input
                        className="field-input"
                        placeholder="Search actions, admins or details"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button size="sm" variant="secondary" onClick={exportJson} disabled={!logs?.length}>
                    <Icon name="clipboard" size={16} />
                    Export JSON
                </Button>
            </div>

            {loading ? (
                <div className="ac-panel-body">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton"
                            style={{ height: 36, borderRadius: 8, marginBottom: 8, opacity: 1 - i * 0.09 }} />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <div className="ac-empty">
                    <Icon name="terminal" size={28} />
                    <div className="ac-empty-title">No entries</div>
                    <p className="ac-empty-text">
                        Every moderation action writes a line here as it happens.
                    </p>
                </div>
            ) : (
                <>
                    <div className="ac-table-wrap ac-desktop-only">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">Admin</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Details</th>
                                    <th scope="col">Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(log => (
                                    <tr key={log._id}>
                                        <td className="ac-num">{formatDateTime(log.createdAt)}</td>
                                        <td className="ac-user-name">@{log.adminId?.username || 'system'}</td>
                                        <td><span className="ac-badge is-accent">{log.action}</span></td>
                                        <td><div className="ac-truncate">{log.details || '--'}</div></td>
                                        <td><span className="ac-badge">{log.targetType}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ac-cards ac-mobile-only">
                        {visible.map(log => (
                            <div key={log._id} className="ac-card">
                                <div className="ac-card-head">
                                    <span className="ac-badge is-accent">{log.action}</span>
                                    <span className="ac-user-meta">{formatDateTime(log.createdAt)}</span>
                                </div>
                                <div className="ac-user-meta">{log.details || 'No details recorded'}</div>
                                <div className="ac-user-meta">by @{log.adminId?.username || 'system'}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}

function formatDateTime(value) {
    if (!value) return '--'
    return new Date(value).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}
