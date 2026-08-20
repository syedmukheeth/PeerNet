import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '../../../components/ui/icons'
import Button from '../../../components/ui/Button'
import avatarFallback from '../../../components/ui/avatarFallback'
import { isAdmin } from '../../../utils/roles'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'
import Skeleton from '../../../components/ui/Skeleton'
import TableRowsSkeleton from '../TableRowsSkeleton'
import ConfirmDialog from '../../../components/ConfirmDialog'

const STATUS_TONE = { active: 'is-good', suspended: 'is-warn', banned: 'is-bad' }

export default function UsersScreen() {
    const [search, setSearch] = useState('')
    const [dialog, setDialog] = useState(null)
    const [warning, setWarning] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        const { data } = await adminApi.getUsers()
        return data.users || []
    }, [])

    const { data: users, loading, refresh } = useAdminData(load, 'Could not load users')

    // This filter used to be written out three times in the same component,
    // once for the card list, once for the table and once for the empty state,
    // so it ran three times on every keystroke.
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users || []
        return (users || []).filter(u =>
            // Guest accounts created through /auth/guest have no email, and a
            // bare .toLowerCase() on it threw and took down the whole console.
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        )
    }, [users, search])

    const run = async (action, successMessage) => {
        setBusy(true)
        try {
            await action()
            toast.success(successMessage)
            setDialog(null)
            setWarning('')
            refresh()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        } finally {
            setBusy(false)
        }
    }

    const onVerify = (user) => run(
        () => adminApi.toggleVerifyUser(user._id),
        user.isVerified ? 'Verification removed' : 'User verified'
    )

    return (
        <section className="ac-panel">
            <div className="ac-toolbar">
                <div>
                    <div className="ac-panel-title">Users</div>
                    <div className="ac-panel-sub">
                        {loading
                            ? <Skeleton h={12} w={72} radius="var(--r-xs)" />
                            : `${visible.length} of ${users?.length || 0}`}
                    </div>
                </div>
                <div className="field field-sm">
                    <Icon name="search" size={16} className="field-icon" />
                    <input
                        className="field-input"
                        placeholder="Search by username or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <TableRowsSkeleton columns={5} />
            ) : visible.length === 0 ? (
                <div className="ac-empty">
                    <Icon name="users" size={28} />
                    <div className="ac-empty-title">No users match</div>
                    <p className="ac-empty-text">Try a different username or email.</p>
                </div>
            ) : (
                <>
                    <div className="ac-table-wrap ac-desktop-only">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th scope="col">User</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Role</th>
                                    <th scope="col">Joined</th>
                                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="ac-user">
                                                <img
                                                    className="ac-user-img"
                                                    src={user.avatarUrl || avatarFallback(user.username)}
                                                    alt=""
                                                />
                                                <div>
                                                    <div className="ac-user-name">
                                                        @{user.username}
                                                        {user.isVerified && (
                                                            <Icon name="verified" size={14} solid
                                                                style={{ marginLeft: 6, verticalAlign: -2, color: 'var(--accent)' }} />
                                                        )}
                                                    </div>
                                                    <div className="ac-user-meta">{user.email || 'Guest account'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`ac-badge ${STATUS_TONE[user.status] || ''}`}>
                                                {user.status || 'active'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`ac-badge ${isAdmin(user) ? 'is-accent' : ''}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="ac-num">{formatDate(user.createdAt)}</td>
                                        <td>
                                            <div className="ac-cell-actions">
                                                <Button size="sm" variant="ghost" onClick={() => onVerify(user)}>
                                                    {user.isVerified ? 'Unverify' : 'Verify'}
                                                </Button>
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => setDialog({ type: 'warn', user })}>
                                                    Warn
                                                </Button>
                                                {user.status === 'banned' ? (
                                                    <Button size="sm" variant="secondary"
                                                        onClick={() => setDialog({ type: 'status', user, status: 'active' })}>
                                                        Reactivate
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="secondary"
                                                        onClick={() => setDialog({ type: 'status', user, status: 'banned' })}>
                                                        Ban
                                                    </Button>
                                                )}
                                                <Button size="iconSm" variant="ghost" aria-label={`Delete @${user.username}`}
                                                    onClick={() => setDialog({ type: 'delete', user })}>
                                                    <Icon name="delete" size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ac-cards ac-mobile-only">
                        {visible.map(user => (
                            <div key={user._id} className="ac-card">
                                <div className="ac-card-head">
                                    <div className="ac-user">
                                        <img className="ac-user-img"
                                            src={user.avatarUrl || avatarFallback(user.username)} alt="" />
                                        <div>
                                            <div className="ac-user-name">@{user.username}</div>
                                            <div className="ac-user-meta">{user.email || 'Guest account'}</div>
                                        </div>
                                    </div>
                                    <span className={`ac-badge ${STATUS_TONE[user.status] || ''}`}>
                                        {user.status || 'active'}
                                    </span>
                                </div>
                                <div className="ac-card-actions">
                                    <Button size="sm" variant="secondary" onClick={() => onVerify(user)}>
                                        {user.isVerified ? 'Unverify' : 'Verify'}
                                    </Button>
                                    <Button size="sm" variant="secondary"
                                        onClick={() => setDialog({ type: 'warn', user })}>
                                        Warn
                                    </Button>
                                    <Button size="sm" variant="danger"
                                        onClick={() => setDialog({ type: 'delete', user })}>
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {dialog?.type === 'warn' && (
                <ConfirmDialog
                    title={`Warn @${dialog.user.username}`}
                    body="This sends the account a system notification. It is recorded in the activity log."
                    confirmLabel="Send warning"
                    busy={busy}
                    closeOnConfirm={false}
                    confirmDisabled={!warning.trim()}
                    onClose={() => { setDialog(null); setWarning('') }}
                    onConfirm={() => run(
                        () => adminApi.warnUser(dialog.user._id, warning.trim()),
                        'Warning sent'
                    )}
                >
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="What is the warning about?"
                        value={warning}
                        onChange={(e) => setWarning(e.target.value)}
                    />
                </ConfirmDialog>
            )}

            {dialog?.type === 'status' && (
                <ConfirmDialog
                    title={dialog.status === 'banned'
                        ? `Ban @${dialog.user.username}?`
                        : `Reactivate @${dialog.user.username}?`}
                    body={dialog.status === 'banned'
                        ? 'The account keeps its content but can no longer sign in. This is reversible.'
                        : 'The account can sign in again immediately.'}
                    confirmLabel={dialog.status === 'banned' ? 'Ban account' : 'Reactivate'}
                    destructive={dialog.status === 'banned'}
                    busy={busy}
                    closeOnConfirm={false}
                    onClose={() => setDialog(null)}
                    onConfirm={() => run(
                        () => adminApi.setUserStatus(dialog.user._id, dialog.status),
                        dialog.status === 'banned' ? 'Account banned' : 'Account reactivated'
                    )}
                />
            )}

            {dialog?.type === 'delete' && (
                <ConfirmDialog
                    title={`Delete @${dialog.user.username}?`}
                    body="Permanent. Posts, comments, messages and follows are removed with the account and cannot be restored."
                    confirmLabel="Delete permanently"
                    destructive
                    busy={busy}
                    closeOnConfirm={false}
                    onClose={() => setDialog(null)}
                    onConfirm={() => run(
                        () => adminApi.deleteUser(dialog.user._id),
                        'Account deleted'
                    )}
                />
            )}
        </section>
    )
}


function formatDate(value) {
    if (!value) return '--'
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    })
}
