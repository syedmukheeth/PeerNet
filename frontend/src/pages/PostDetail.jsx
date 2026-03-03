import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiArrowLeft } from 'react-icons/hi'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'

export default function PostDetail() {
    const { id } = useParams()
    const { user } = useAuth()
    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [body, setBody] = useState('')
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const inputRef = useRef()

    useEffect(() => {
        Promise.all([
            api.get(`/posts/${id}`),
            api.get(`/posts/${id}/comments`, { params: { limit: 30 } }),
        ]).then(([{ data: pd }, { data: cd }]) => {
            setPost(pd.data)
            setLiked(pd.data.isLiked || false)
            setLikesCount(pd.data.likesCount || 0)
            setComments(cd.data || [])
        }).catch(() => toast.error('Post not found'))
            .finally(() => setLoading(false))
    }, [id])

    const handleLike = async () => {
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(newLiked ? likesCount + 1 : likesCount - 1)
        try {
            if (newLiked) await api.post(`/posts/${id}/like`)
            else await api.delete(`/posts/${id}/like`)
        } catch { setLiked(!newLiked); setLikesCount(likesCount) }
    }

    const handleComment = async (e) => {
        e.preventDefault()
        if (!body.trim()) return
        try {
            const { data } = await api.post(`/posts/${id}/comments`, { body })
            setComments([data.data, ...comments])
            setBody('')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post comment')
        }
    }

    if (loading) return <div className="flex justify-center" style={{ padding: 60 }}><div className="spinner" /></div>
    if (!post) return null

    const author = post.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6c63ff&color=fff`

    return (
        <div className="fade-in">
            <div className="flex items-center gap-12" style={{ marginBottom: 20 }}>
                <Link to={-1} className="btn btn-ghost btn-icon"><HiArrowLeft /></Link>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Post</h2>
            </div>

            <div className="post-card">
                <div className="post-header">
                    <Link to={`/profile/${author._id}`}>
                        <img src={avatar} className="avatar avatar-md" alt="" />
                    </Link>
                    <div style={{ flex: 1 }}>
                        <Link to={`/profile/${author._id}`} className="post-author-name">{author.username}</Link>
                        <div className="post-author-time">{timeago(post.createdAt)}</div>
                    </div>
                </div>
                {post.mediaType === 'video'
                    ? <video src={post.mediaUrl} className="post-media-video" controls />
                    : <img src={post.mediaUrl} className="post-media" alt="" />
                }
                <div className="post-actions">
                    <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                        {liked ? <HiHeart style={{ fontSize: 22 }} /> : <HiOutlineHeart style={{ fontSize: 22 }} />}
                        <span>{likesCount}</span>
                    </button>
                </div>
                {post.caption && (
                    <div className="post-caption">
                        <strong>{author.username}</strong>{' '}{post.caption}
                    </div>
                )}
            </div>

            {/* Comments */}
            <div className="card" style={{ marginTop: 16, padding: 16 }}>
                <form className="flex gap-3 items-center" onSubmit={handleComment} style={{ marginBottom: 16 }}>
                    <img
                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6c63ff&color=fff`}
                        className="avatar avatar-sm" alt="" />
                    <input className="input" placeholder="Add a comment…" value={body}
                        onChange={e => setBody(e.target.value)} ref={inputRef} />
                    <button className="btn btn-primary btn-sm" type="submit" disabled={!body.trim()}>Post</button>
                </form>

                {comments.length === 0
                    ? <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>No comments yet</p>
                    : comments.map((c) => {
                        const cAvatar = c.author?.avatarUrl || `https://ui-avatars.com/api/?name=${c.author?.username}&background=6c63ff&color=fff`
                        return (
                            <div key={c._id} className="comment-item">
                                <img src={cAvatar} className="avatar avatar-sm" alt="" />
                                <div>
                                    <div className="comment-body">
                                        <strong>{c.author?.username}</strong>{' '}{c.body}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{timeago(c.createdAt)}</div>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}
