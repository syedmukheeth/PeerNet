import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '../../../components/ui/icons'
import Button from '../../../components/ui/Button'
import avatarFallback from '../../../components/ui/avatarFallback'
import * as adminApi from '../admin.api'
import { useAdminData } from '../useAdminData'
import TableRowsSkeleton from '../TableRowsSkeleton'
import ConfirmDialog from '../../../components/ConfirmDialog'

const TYPES = [
    { id: 'all', label: 'All' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Video' },
    { id: 'text', label: 'Text' }
]

/*
 * Four fields on this screen read keys the Post model does not have, so they
 * rendered blank or zero on every row: `post.type` (the schema calls it
 * mediaType), `post.content` (caption), and `post.likes.length` /
 * `post.comments.length` (likesCount and commentsCount are scalars, there are
 * no arrays to take a length of).
 */
export default function ContentScreen() {
    const [type, setType] = useState('all')
    const [search, setSearch] = useState('')
    const [dialog, setDialog] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        const { data } = await adminApi.getPosts(type)
        return data.posts || []
    }, [type])

    const { data: posts, loading, refresh } = useAdminData(load, 'Could not load content')

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return posts || []
        return (posts || []).filter(p =>
            (p.caption || '').toLowerCase().includes(q) ||
            (p.author?.username || '').toLowerCase().includes(q)
        )
    }, [posts, search])

    const run = async (action, successMessage) => {
        setBusy(true)
        try {
            await action()
            toast.success(successMessage)
            setDialog(null)
            refresh()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        } finally {
            setBusy(false)
        }
    }

    const onToggleVisibility = (post) => run(
        () => adminApi.setPostVisibility(post._id, !post.isHidden),
        post.isHidden ? 'Post restored' : 'Post hidden'
    )

    return (
        <section className="ac-panel">
            <div className="ac-toolbar">
                <div className="ac-segmented">
                    {TYPES.map(t => (
                        <button key={t.id} type="button"
                            className={type === t.id ? 'active' : ''}
                            onClick={() => setType(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="field field-sm">
                    <Icon name="search" size={16} className="field-icon" />
                    <input
                        className="field-input"
                        placeholder="Search captions or authors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <TableRowsSkeleton columns={6} />
            ) : visible.length === 0 ? (
                <div className="ac-empty">
                    <Icon name="collection" size={28} />
                    <div className="ac-empty-title">Nothing here</div>
                    <p className="ac-empty-text">No posts match this filter.</p>
                </div>
            ) : (
                <>
                    <div className="ac-table-wrap ac-desktop-only">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th scope="col">Post</th>
                                    <th scope="col">Author</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Engagement</th>
                                    <th scope="col">Posted</th>
                                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(post => (
                                    <tr key={post._id}>
                                        <td>
                                            <div className="ac-truncate">
                                                {post.caption || <span className="ac-muted">No caption</span>}
                                            </div>
                                            {post.isHidden && <span className="ac-badge is-warn">Hidden</span>}
                                        </td>
                                        <td>
                                            <div className="ac-user">
                                                <img className="ac-user-img"
                                                    style={{ width: 24, height: 24 }}
                                                    src={post.author?.avatarUrl || avatarFallback(post.author?.username)}
                                                    alt="" />
                                                <span className="ac-user-name">@{post.author?.username || 'deleted'}</span>
                                            </div>
                                        </td>
                                        <td><span className="ac-badge">{post.mediaType}</span></td>
                                        <td className="ac-num">
                                            {(post.likesCount || 0).toLocaleString()} likes,{' '}
                                            {(post.commentsCount || 0).toLocaleString()} comments
                                        </td>
                                        <td className="ac-num">{formatDate(post.createdAt)}</td>
                                        <td>
                                            <div className="ac-cell-actions">
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => onToggleVisibility(post)}>
                                                    {post.isHidden ? 'Restore' : 'Hide'}
                                                </Button>
                                                <Button size="iconSm" variant="ghost" aria-label="Delete post"
                                                    onClick={() => setDialog(post)}>
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
                        {visible.map(post => (
                            <div key={post._id} className="ac-card">
                                <div className="ac-card-head">
                                    <span className="ac-user-name">@{post.author?.username || 'deleted'}</span>
                                    <span className="ac-badge">{post.mediaType}</span>
                                </div>
                                <div className="ac-user-meta">
                                    {post.caption || 'No caption'}
                                </div>
                                <div className="ac-card-actions">
                                    <Button size="sm" variant="secondary"
                                        onClick={() => onToggleVisibility(post)}>
                                        {post.isHidden ? 'Restore' : 'Hide'}
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => setDialog(post)}>
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
                    title="Delete this post?"
                    body="Permanent. Its comments and likes go with it. Hiding is reversible, deleting is not."
                    confirmLabel="Delete permanently"
                    destructive
                    busy={busy}
                    closeOnConfirm={false}
                    onClose={() => setDialog(null)}
                    onConfirm={() => run(() => adminApi.deletePost(dialog._id), 'Post deleted')}
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
