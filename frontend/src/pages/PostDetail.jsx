import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import EmojiPicker from 'emoji-picker-react';
import {
    HiHeart, HiOutlineHeart, HiBookmark, HiOutlineBookmark,
    HiDotsHorizontal, HiShare, HiPencil, HiTrash, HiArrowLeft,
    HiBadgeCheck, HiEmojiHappy, HiShieldCheck,
} from 'react-icons/hi'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'
import EditPostModal from '../components/EditPostModal'

export default function PostDetail() {
    const { id } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [body, setBody] = useState('')
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const [replyData, setReplyData] = useState({}) // { commentId: { replies: [], loading: false, show: false } }
    const [isScanning, setIsScanning] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const inputRef = useRef()
    const menuRef = useRef()
    const commentsEndRef = useRef()
    const emojiRef = useRef()

    useEffect(() => {
        Promise.all([
            api.get(`/posts/${id}`),
            api.get(`/posts/${id}/comments`, { params: { limit: 50 } }),
        ]).then(([{ data: pd }, { data: cd }]) => {
            setPost(pd.data)
            setLiked(pd.data.isLiked || false)
            setLikesCount(pd.data.likesCount || 0)
            setSaved(pd.data.isSaved || false)
            setComments(cd.data || [])
        }).catch(() => toast.error('Post not found'))
            .finally(() => setLoading(false))
    }, [id])

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [menuOpen])

    // Close emoji picker on outside click
    useEffect(() => {
        if (!showEmojiPicker) return
        const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmojiPicker(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showEmojiPicker])

    const handleLike = async () => {
        if (!user) { toast.error('Please sign in to like posts'); return navigate('/login'); }
        const next = !liked; setLiked(next); setLikesCount(c => next ? c + 1 : c - 1)
        try { next ? await api.post(`/posts/${id}/like`) : await api.delete(`/posts/${id}/like`) }
        catch { setLiked(!next); setLikesCount(c => next ? c - 1 : c + 1) }
    }

    const handleSave = async () => {
        if (!user) { toast.error('Please sign in to save posts'); return navigate('/login'); }
        const next = !saved; setSaved(next)
        try { next ? await api.post(`/posts/${id}/save`) : await api.delete(`/posts/${id}/save`) }
        catch { setSaved(!next) }
    }

    const handleShare = () => {
        const url = `${window.location.origin}/posts/${id}`
        if (navigator.share) navigator.share({ title: 'PeerNet post', url })
        else navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
    }

    const handleDelete = async () => {
        if (!confirm('Delete this post?')) return
        try { await api.delete(`/posts/${id}`); toast.success('Post deleted'); navigate(-1) }
        catch { toast.error('Delete failed') }
    }

    const handleComment = async (e) => {
        e.preventDefault()
        if (!user) { toast.error('Please sign in to comment'); return navigate('/login'); }
        if (!body.trim()) return
        setIsScanning(true)
        try {
            const payload = { body }
            if (replyingTo) payload.parentComment = replyingTo._id

            const { data } = await api.post(`/posts/${id}/comments`, payload)

            if (replyingTo) {
                // Add to replies of the parent comment
                setReplyData(prev => ({
                    ...prev,
                    [replyingTo._id]: {
                        ...prev[replyingTo._id],
                        replies: [...(prev[replyingTo._id]?.replies || []), data.data],
                        show: true
                    }
                }))
            } else {
                // Add to top level comments
                setComments(c => [...c, data.data])
                setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
            
            setBody('')
            setReplyingTo(null)
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setIsScanning(false) }
    }

    const toggleReplies = async (commentId) => {
        const current = replyData[commentId]
        
        // If we already have them and are showing them, hide them
        if (current?.show) {
            setReplyData(prev => ({ ...prev, [commentId]: { ...prev[commentId], show: false } }))
            return
        }

        // If we already have them but they're hidden, just show them
        if (current?.replies) {
            setReplyData(prev => ({ ...prev, [commentId]: { ...prev[commentId], show: true } }))
            return
        }

        // Otherwise fetch them
        setReplyData(prev => ({ ...prev, [commentId]: { loading: true, show: true, replies: [] } }))
        try {
            const { data } = await api.get(`/posts/${id}/comments/${commentId}/replies`)
            setReplyData(prev => ({
                ...prev,
                [commentId]: { loading: false, show: true, replies: data.data || [] }
            }))
        } catch {
            setReplyData(prev => ({ ...prev, [commentId]: { loading: false, show: false, replies: [] } }))
            toast.error('Failed to load replies')
        }
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
    if (!post) return null

    const author = post.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6366F1&color=fff`
    const isOwner = user?._id === (author._id || author)

    return (
        <>
            {/* Back header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon"><HiArrowLeft /></button>
                <span style={{ fontWeight: 700, fontSize: 17 }}>Post</span>
            </div>

            {/* Instagram split-view card */}
            <div className="post-detail-card">

                {/* ── LEFT: media ──────────────────────────── */}
                <div className="post-detail-media">
                    {post.mediaType === 'video'
                        ? <video src={post.mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <img src={post.mediaUrl} alt={post.caption} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    }
                </div>

                {/* ── RIGHT: info + comments ───────────────── */}
                <div className="post-detail-info">

                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                        borderBottom: '1px solid var(--border)', flexShrink: 0,
                    }}>
                        <Link to={`/profile/${author._id}`}>
                            <img src={avatar} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                        </Link>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 14 }}>
                                <Link to={`/profile/${author._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeago(post.createdAt)}</div>
                        </div>

                        {/* ··· menu */}
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(o => !o)}>
                                <HiDotsHorizontal />
                            </button>
                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -6 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -6 }}
                                        transition={{ duration: 0.12 }}
                                        style={{
                                            position: 'absolute', top: '100%', right: 0, zIndex: 50,
                                            background: 'var(--surface)', border: '1px solid var(--border-md)',
                                            borderRadius: 12, boxShadow: 'var(--shadow-lg)',
                                            minWidth: 170, overflow: 'hidden',
                                        }}>
                                        <button onClick={handleShare} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 14 }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <HiShare /> Copy link
                                        </button>
                                        {isOwner && (
                                            <>
                                                <button onClick={() => { setMenuOpen(false); setEditOpen(true) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 14 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                    <HiPencil /> Edit post
                                                </button>
                                                <button onClick={() => { setMenuOpen(false); handleDelete() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                    <HiTrash /> Delete post
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Caption */}
                    {post.caption && (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <img src={avatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} alt="" />
                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                                <strong style={{ marginRight: 6 }}>{author.username}</strong>
                                {post.caption}
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {comments.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', textAlign: 'center', gap: 8 }}>
                                <span style={{ fontSize: 32 }}>💬</span>
                                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>No comments yet</p>
                                <p style={{ fontSize: 13 }}>Be the first to comment</p>
                            </div>
                        ) : (
                            comments.map(c => {
                                const cav = c.author?.avatarUrl || `https://ui-avatars.com/api/?name=${c.author?.username}&background=6366F1&color=fff`
                                return (
                                    <div key={c._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <Link to={`/profile/${c.author?._id}`}>
                                            <img src={cav} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} alt="" />
                                        </Link>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                                                <strong style={{ marginRight: 6 }}>
                                                    <Link to={`/profile/${c.author?._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
                                                        {c.author?.username}
                                                    </Link>
                                                </strong>
                                                {c.body}
                                                {c.isAiVerified && (
                                                    <HiShieldCheck 
                                                        style={{ color: '#10B981', fontSize: 13, marginLeft: 4, verticalAlign: 'middle', cursor: 'help' }} 
                                                        title="AI Verified Safe" 
                                                    />
                                                )}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <span>{timeago(c.createdAt)}</span>
                                                <button 
                                                    onClick={() => {
                                                        if (!user) { toast.error('Please sign in to reply'); return navigate('/login'); }
                                                        setReplyingTo(replyingTo?._id === c._id ? null : c);
                                                        if (replyingTo?._id !== c._id) setTimeout(() => inputRef.current?.focus(), 10);
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: replyingTo?._id === c._id ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    {replyingTo?._id === c._id ? 'Cancel reply' : 'Reply'}
                                                </button>
                                            </div>

                                            {/* Replies Toggle */}
                                            <div style={{ marginTop: 8 }}>
                                                <button 
                                                    onClick={() => toggleReplies(c._id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    <div style={{ width: 20, height: 1, background: 'var(--border)' }} />
                                                    {replyData[c._id]?.loading ? 'Loading...' : replyData[c._id]?.show ? 'Hide replies' : 'View replies'}
                                                </button>
                                            </div>

                                            {/* Replies List */}
                                            {replyData[c._id]?.show && (
                                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {replyData[c._id]?.replies?.map(reply => {
                                                        const rav = reply.author?.avatarUrl || `https://ui-avatars.com/api/?name=${reply.author?.username}&background=6366F1&color=fff`
                                                        return (
                                                            <div key={reply._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                                <Link to={`/profile/${reply.author?._id}`}>
                                                                    <img src={rav} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} alt="" />
                                                                </Link>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                                                        <strong style={{ marginRight: 6 }}>
                                                                            <Link to={`/profile/${reply.author?._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
                                                                                {reply.author?.username}
                                                                            </Link>
                                                                        </strong>
                                                                        {reply.body}
                                                                        {reply.isAiVerified && (
                                                                            <HiShieldCheck 
                                                                                style={{ color: '#10B981', fontSize: 12, marginLeft: 4, verticalAlign: 'middle', cursor: 'help' }} 
                                                                                title="AI Verified Safe" 
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{timeago(reply.createdAt)}</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Action bar */}
                    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                            <motion.button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike} whileTap={{ scale: 0.85 }}>
                                {liked ? <HiHeart style={{ fontSize: 24 }} /> : <HiOutlineHeart style={{ fontSize: 24 }} />}
                            </motion.button>
                            <div style={{ position: 'relative' }} ref={emojiRef}>
                                <button className="post-action-btn" onClick={() => setShowEmojiPicker(p => !p)}>
                                    <HiEmojiHappy style={{ fontSize: 22 }} />
                                </button>
                                {showEmojiPicker && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 100, marginBottom: 8 }}>
                                        <EmojiPicker 
                                            theme="dark"
                                            onEmojiClick={(e) => setBody(prev => prev + e.emoji)}
                                        />
                                    </div>
                                )}
                            </div>
                            <button className="post-action-btn" onClick={handleShare}>
                                <HiShare style={{ fontSize: 22 }} />
                            </button>
                            <motion.button className={`post-action-btn ${saved ? 'saved' : ''}`} onClick={handleSave} whileTap={{ scale: 0.85 }} style={{ marginLeft: 'auto' }}>
                                {saved ? <HiBookmark style={{ fontSize: 22 }} /> : <HiOutlineBookmark style={{ fontSize: 22 }} />}
                            </motion.button>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{likesCount.toLocaleString()} likes</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>{timeago(post.createdAt)}</div>

                        {/* Comment input */}
                        <form onSubmit={handleComment} style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                            <div style={{ flex: 1, position: 'relative' }}>
                                {replyingTo && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, fontSize: 11, color: 'var(--text-3)', paddingBottom: 6 }}>
                                        Replying to <strong>{replyingTo.author?.username}</strong>
                                    </div>
                                )}
                                <input
                                    ref={inputRef}
                                    value={body} onChange={e => setBody(e.target.value)}
                                    placeholder={replyingTo ? 'Write a reply...' : 'Add a comment…'}
                                    style={{
                                        width: '100%', background: 'none', border: 'none', outline: 'none',
                                        color: 'var(--text-1)', fontSize: 14,
                                    }} />
                            </div>
                            {body.trim() && (
                                <button type="submit" disabled={isScanning} style={{ background: 'none', border: 'none', cursor: isScanning ? 'default' : 'pointer', color: isScanning ? 'var(--text-3)' : 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
                                    {isScanning ? 'AI Scanning...' : 'Post'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {editOpen && (
                <EditPostModal
                    post={post}
                    onClose={() => setEditOpen(false)}
                    onSave={(updated) => { setPost(p => ({ ...p, ...updated })); setEditOpen(false) }}
                />
            )}
        </>
    )
}
