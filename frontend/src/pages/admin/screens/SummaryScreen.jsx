import { useCallback, useState } from 'react'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'
import Metric from '../Metric'
import Skeleton from '../../../components/ui/Skeleton'
import TrendChart from '../TrendChart'

/*
 * Every number here comes from GET /admin/analytics.
 *
 * The screen this replaces read `stats.totalUsers` and `stats.totalPosts` off
 * GET /admin/stats, which returns `userCount` and `postCount`. Those keys did
 * not exist on the response, so the two headline cards rendered 0 on a
 * populated platform. The analytics payload that does carry them was already
 * being fetched and passed in, then dropped by a component whose signature
 * only destructured `stats`.
 *
 * Removed rather than restyled: a "System Health 99.9%" card, a "Reliability
 * 99.9%" chip, a "System Status: Working" chip, and a Traffic Locations panel
 * reporting North America 42% / Europe 28% / Asia Pacific 18% / Others 12%.
 * All six were literals in the JSX. No geo data is collected anywhere in the
 * backend, so the locations panel is gone rather than reworded.
 */
export default function SummaryScreen() {
    const [series, setSeries] = useState('users')

    const load = useCallback(async () => {
        const { data } = await adminApi.getAnalytics()
        return data.data
    }, [])

    const { data, loading } = useAdminData(load, 'Could not load platform analytics')

    const chart = series === 'users' ? data?.charts?.userGrowth : data?.charts?.postGrowth
    const storage = data?.storage

    return (
        <div className="ac-stack">
            <div className="ac-grid">
                <Metric loading={loading} icon="users" label="Users"
                    value={fmt(data?.totalUsers)}
                    sub={`${fmt(data?.bannedUsers)} banned`} />
                <Metric loading={loading} icon="collection" label="Posts"
                    value={fmt(data?.totalPosts)}
                    sub={`${fmt(data?.totalStories)} stories`} />
                <Metric loading={loading} icon="comment" label="Comments"
                    value={fmt(data?.totalComments)}
                    sub={`${fmt(data?.commentsToday)} today`} />
                <Metric loading={loading} icon="report" label="Pending reports"
                    value={fmt(data?.pendingReports)}
                    alert={data?.pendingReports > 0}
                    sub={data?.pendingReports > 0 ? 'Needs review' : 'Queue clear'} />
                <Metric loading={loading} icon="bolt" label="Active today"
                    value={fmt(data?.activeToday)}
                    sub="Signed in within 24h" />
                <Metric loading={loading} icon="user-add" label="New signups"
                    value={fmt(data?.signupsToday)}
                    sub="Since midnight" />
            </div>

            <section className="ac-panel">
                <div className="ac-panel-head">
                    <div>
                        <div className="ac-panel-title">Growth</div>
                        <div className="ac-panel-sub">Last 30 days</div>
                    </div>
                    <div className="ac-segmented">
                        <button type="button"
                            className={series === 'users' ? 'active' : ''}
                            onClick={() => setSeries('users')}>Users</button>
                        <button type="button"
                            className={series === 'posts' ? 'active' : ''}
                            onClick={() => setSeries('posts')}>Posts</button>
                    </div>
                </div>
                <div className="ac-panel-body">
                    {loading
                        ? <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
                        : <TrendChart data={chart} label={series === 'users' ? 'New users' : 'New posts'} />}
                </div>
            </section>

            <section className="ac-panel">
                <div className="ac-panel-head">
                    <div>
                        <div className="ac-panel-title">Platform status</div>
                        <div className="ac-panel-sub">Derived from the last 50 admin operations</div>
                    </div>
                    {loading ? (
                        // Was hidden entirely while loading, so the badge
                        // popped into the panel head on resolve.
                        <Skeleton h={22} w={72} radius="var(--r-sm)" />
                    ) : (
                        <span className={`ac-badge ${data?.health?.status === 'Healthy' ? 'is-good' : 'is-warn'}`}>
                            {data?.health?.status || 'Unknown'}
                        </span>
                    )}
                </div>
                <div className="ac-panel-body">
                    {/* These rendered the literal string '--' during load,
                        which reads as a real value rather than an absent one. */}
                    <div className="ac-rows">
                        <div className="ac-row">
                            <span className="ac-row-label">Admin operations without errors</span>
                            {loading
                                ? <Skeleton h={14} w={56} radius="var(--r-xs)" />
                                : <span className="ac-row-value">{data?.health?.synchronicity ?? '--'}%</span>}
                        </div>
                        <div className="ac-row">
                            <span className="ac-row-label">Estimated media storage</span>
                            {loading
                                ? <Skeleton h={14} w={140} radius="var(--r-xs)" />
                                : (
                                    <span className="ac-row-value">
                                        {fmt(storage?.usedMB)} MB of {fmt(storage?.maxMB)} MB
                                    </span>
                                )}
                        </div>
                    </div>

                    {/* The meter was absent during load and then appeared,
                        growing the panel by about 70px. */}
                    {loading && (
                        <div className="ac-meter" style={{ marginTop: 16 }}>
                            <div className="ac-meter-head">
                                <Skeleton h={13} w={88} radius="var(--r-xs)" />
                                <Skeleton h={13} w={36} radius="var(--r-xs)" />
                            </div>
                            <Skeleton h={6} radius="var(--r-full)" className="w-full" />
                            <Skeleton h={12} w="70%" radius="var(--r-xs)" />
                        </div>
                    )}

                    {!loading && storage && (
                        <div className="ac-meter" style={{ marginTop: 16 }}>
                            <div className="ac-meter-head">
                                <span>Storage used</span>
                                <span className="ac-meter-value">{storage.percentage}%</span>
                            </div>
                            <div className="ac-meter-track">
                                <div
                                    className={`ac-meter-fill ${storage.percentage > 90 ? 'is-bad' : storage.percentage > 70 ? 'is-warn' : ''}`}
                                    style={{ width: `${storage.percentage}%` }}
                                />
                            </div>
                            {/* The backend estimates this from a per-post byte
                                assumption rather than measuring the bucket, so
                                it is labelled as an estimate everywhere. */}
                            <span className="ac-metric-sub">Estimated from post and story counts, not measured</span>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '--')
