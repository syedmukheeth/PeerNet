import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '../../../components/ui/icons'
import Button from '../../../components/ui/Button'
import avatarFallback from '../../../components/ui/avatarFallback'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'
import Skeleton from '../../../components/ui/Skeleton'
import TableRowsSkeleton from '../TableRowsSkeleton'
import ConfirmDialog from '../../../components/ConfirmDialog'

export default function CommentsScreen() {
    const [search, setSearch] = useState('')
    const [dialog, setDialog] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        const { data } = await adminApi.getComments()
        return data.comments || []
    }, [])

    const { data: comments, loading, refresh } = useAdminData(load, 'Could not load comments')

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return comments || []
        // Comment stores its text in `body`. The old filter read `content`,
        // which does not exist, so searching matched nothing at all.
        return (comments || []).filter(c =>
            (c.body || '').toLowerCase().includes(q) ||
            (c.author?.username || '').toLowerCase().includes(q)
        )
    }, [comments, search])

    const onDelete = async () => {
        setBusy(true)
        try {
            await adminApi.deleteComment(dialog._id)
            toast.success('Comment deleted')
            setDialog(null)
            refresh()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="ac-panel">
            <div className="ac-toolbar">
                <div>
                    <div className="ac-panel-title">Comments</div>
                    <div className="ac-panel-sub">
                        {loading
                            ? <Skeleton h={12} w={72} radius="var(--r-xs)" />
                            : `${visible.length} of ${comments?.length || 0}`}
                    </div>
                </div>
                <div className="field field-sm">
                    <Icon name="search" size={16} className="field-icon" />
                    <input
                        className="field-input"
                        placeholder="Search comments or authors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <TableRowsSkeleton columns={5} />
            ) : visible.length === 0 ? (
                <div className="ac-empty">
                    <Icon name="comment" size={28} />
                    <div className="ac-empty-title">No comments match</div>
                    <p className="ac-empty-text">Try a different word or author.</p>
                </div>
            ) : (
                <>
                    <div className="ac-table-wrap ac-desktop-only">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th scope="col">Comment</th>
                                    <th scope="col">Author</th>
                                    <th scope="col">On post</th>
                                    <th scope="col">Posted</th>
                                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(comment => (
                                    <tr key={comment._id}>
                                        <td><div className="ac-truncate">{comment.body}</div></td>
                                        <td>
                                            <div className="ac-user">
                                                <img className="ac-user-img" style={{ width: 24, height: 24 }}
                                                    src={comment.author?.avatarUrl || avatarFallback(comment.author?.username)}
                                                    alt="" />
                                                <span className="ac-user-name">@{comment.author?.username || 'deleted'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ac-truncate ac-muted" style={{ maxWidth: '24ch' }}>
                                                {comment.post?.caption || 'Untitled post'}
                                            </div>
                                        </td>
                                        <td className="ac-num">{formatDate(comment.createdAt)}</td>
                                        <td>
                                            <div className="ac-cell-actions">
                                                <Button size="iconSm" variant="ghost" aria-label="Delete comment"
                                                    onClick={() => setDialog(comment)}>
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
                        {visible.map(comment => (
                            <div key={comment._id} className="ac-card">
                                <div className="ac-card-head">
                                    <span className="ac-user-name">@{comment.author?.username || 'deleted'}</span>
                                    <span className="ac-user-meta">{formatDate(comment.createdAt)}</span>
                                </div>
                                <div className="ac-user-meta">{comment.body}</div>
                                <div className="ac-card-actions">
                                    <Button size="sm" variant="danger" onClick={() => setDialog(comment)}>
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {dialog && (
                <ConfirmDialog
                    title="Delete this comment?"
                    body="Permanent. Replies to it are removed as well."
                    confirmLabel="Delete"
                    destructive
                    busy={busy}
                    closeOnConfirm={false}
                    onClose={() => setDialog(null)}
                    onConfirm={onDelete}
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
