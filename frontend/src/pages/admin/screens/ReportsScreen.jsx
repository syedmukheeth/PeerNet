import { useState } from 'react'
import { useOutletContext } from 'react-router'
import toast from 'react-hot-toast'
import { Icon } from '../../../components/ui/icons'
import Button from '../../../components/ui/Button'
import * as adminApi from '../admin.api'

/*
 * The reporter's name was blank on every row. The screen read
 * `report.reporterId`, but the field is `reporter` (Report.js) and that is
 * what the service populates.
 *
 * targetId is a refPath populate, so its useful text depends on targetType:
 * a Post carries `caption`, a Comment `body`, a User `username`.
 */
export default function ReportsScreen() {
    const { reports, reloadReports } = useOutletContext()
    const [busyId, setBusyId] = useState(null)

    const resolve = async (report, status) => {
        setBusyId(report._id)
        try {
            await adminApi.resolveReport(report._id, status)
            toast.success(status === 'resolved' ? 'Report actioned' : 'Report dismissed')
            reloadReports()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        } finally {
            setBusyId(null)
        }
    }

    if (!reports?.length) {
        return (
            <section className="ac-panel">
                <div className="ac-empty">
                    <Icon name="check-circle" size={28} />
                    <div className="ac-empty-title">Nothing to review</div>
                    <p className="ac-empty-text">
                        No pending reports. New ones appear here and in the sidebar count.
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section className="ac-panel">
            <div className="ac-panel-head">
                <div>
                    <div className="ac-panel-title">Pending reports</div>
                    <div className="ac-panel-sub">{reports.length} waiting on a decision</div>
                </div>
            </div>

            <div className="ac-table-wrap ac-desktop-only">
                <table className="ac-table">
                    <thead>
                        <tr>
                            <th scope="col">Reported by</th>
                            <th scope="col">Reason</th>
                            <th scope="col">Target</th>
                            <th scope="col">Reported</th>
                            <th scope="col" style={{ textAlign: 'right' }}>Decision</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(report => (
                            <tr key={report._id}>
                                <td className="ac-user-name">@{report.reporter?.username || 'unknown'}</td>
                                <td><span className="ac-badge is-bad">{report.reason}</span></td>
                                <td>
                                    <div className="ac-truncate">{targetText(report)}</div>
                                    <span className="ac-badge">{report.targetType}</span>
                                </td>
                                <td className="ac-num">{formatDate(report.createdAt)}</td>
                                <td>
                                    <div className="ac-cell-actions">
                                        <Button size="sm" variant="ghost"
                                            loading={busyId === report._id}
                                            onClick={() => resolve(report, 'dismissed')}>
                                            Dismiss
                                        </Button>
                                        <Button size="sm" variant="danger"
                                            loading={busyId === report._id}
                                            onClick={() => resolve(report, 'resolved')}>
                                            Uphold
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="ac-cards ac-mobile-only">
                {reports.map(report => (
                    <div key={report._id} className="ac-card">
                        <div className="ac-card-head">
                            <span className="ac-user-name">@{report.reporter?.username || 'unknown'}</span>
                            <span className="ac-badge is-bad">{report.reason}</span>
                        </div>
                        <div className="ac-user-meta">{targetText(report)}</div>
                        {report.description && (
                            <div className="ac-user-meta">&ldquo;{report.description}&rdquo;</div>
                        )}
                        <div className="ac-card-actions">
                            <Button size="sm" variant="secondary"
                                loading={busyId === report._id}
                                onClick={() => resolve(report, 'dismissed')}>
                                Dismiss
                            </Button>
                            <Button size="sm" variant="danger"
                                loading={busyId === report._id}
                                onClick={() => resolve(report, 'resolved')}>
                                Uphold
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

function targetText(report) {
    const t = report.targetId
    if (!t) return 'Content no longer exists'
    return t.caption || t.body || (t.username ? `@${t.username}` : 'Content unavailable')
}

function formatDate(value) {
    if (!value) return '--'
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    })
}
