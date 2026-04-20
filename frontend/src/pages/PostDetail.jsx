import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
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
import { PostDetailSkeleton } from '../components/SkeletonLoader'
import { useQueryClient } from '@tanstack/react-query'

export default function PostDetail() {
    const queryClient = useQueryClient()
    const { id } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const urlCommentId = new URLSearchParams(location.search).get('commentId')
    const urlParentId = new URLSearchParams(location.search).get('parentId')
    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [body, setBody] = useState('')
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const [replyData, setReplyData] = useState({}) // { commentId: { replies: [], loading: false, show: false } }
    const [isScanning, setIsScanning] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
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
        }).catch((err) => {
            console.error('Post Detail Error:', err)
            setNotFound(true)
        }).finally(() => setLoading(false))
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
        const next = !liked;
        setLiked(next);
        setLikesCount(c => next ? c + 1 : c - 1);
        
        // Optimistically update the feed cache if it exists
        queryClient.setQueryData(['feed'], (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map(p => ({
                    ...p,
                    data: p.data.map(post => String(post._id) === String(id) ? { ...post, isLiked: next, likesCount: next ? post.likesCount + 1 : post.likesCount - 1 } : post)
                }))
            }
        });

        try { 
            next ? await api.post(`/posts/${id}/like`) : await api.delete(`/posts/${id}/like`) 
        } catch { 
            setLiked(!next); 
            setLikesCount(c => next ? c - 1 : c + 1);
            // Revert feed cache
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        }
    }

    const handleSave = async () => {
        if (!user) { toast.error('Please sign in to save posts'); return navigate('/login'); }
        const next = !saved; setSaved(next)
        
        // Optimistically update the feed cache if it exists
        queryClient.setQueryData(['feed'], (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map(p => ({
                    ...p,
                    data: p.data.map(post => String(post._id) === String(id) ? { ...post, isSaved: next } : post)
                }))
            }
        });

        try { 
            next ? await api.post(`/posts/${id}/save`) : await api.delete(`/posts/${id}/save`) 
            toast.success(next ? 'Saved' : 'Removed from saved')
        } catch { 
            setSaved(!next);
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        }
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
        const text = body.trim()
        if (!text || isScanning) return
        
        setIsScanning(true)
        try {
            const payload = { body: text }
            if (replyingTo) payload.parentComment = replyingTo._id

            const { data } = await api.post(`/posts/${id}/comments`, payload)

            // Clear early to prevent double submission
            setBody('')
            setReplyingTo(null)

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
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Failed to post comment') 
        } finally { 
            setIsScanning(false) 
        }
    }

    const toggleReplies = useCallback(async (commentId) => {
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
    }, [id, replyData])

    // Auto-scroll and flash target comment if provided via URL
    useEffect(() => {
        if (!urlCommentId || comments.length === 0) return;

        const executeHighlight = () => {
            const el = document.getElementById(`comment-${urlCommentId}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                const originalBg = el.style.backgroundColor || 'transparent'
                el.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'
                el.style.transition = 'background-color 0.8s ease'
                setTimeout(() => el.style.backgroundColor = originalBg, 2000)
            }
        };

        if (urlParentId) {
            // Need to expand the parent first
            if (!replyData[urlParentId]?.show) {
                toggleReplies(urlParentId).then(() => {
                    // Small delay to allow DOM to render replies
                    setTimeout(executeHighlight, 400); 
                });
            } else {
                executeHighlight();
            }
        } else {
            executeHighlight();
        }
    }, [comments, urlCommentId, urlParentId, replyData, toggleReplies])

    const handleDeleteComment = async (commentId, isReply, parentId) => {
        if (!confirm('Delete this comment?')) return
        try {
            await api.delete(`/comments/${commentId}`)
            if (isReply) {
                setReplyData(prev => ({
                    ...prev,
                    [parentId]: {
                        ...prev[parentId],
                        replies: prev[parentId].replies.filter(r => r._id !== commentId)
                    }
                }))
            } else {
                setComments(prev => prev.filter(c => c._id !== commentId))
            }
            setPost(p => ({ ...p, commentsCount: (p.commentsCount || 1) - 1 }))
            toast.success('Comment deleted')
        } catch {
            toast.error('Failed to delete comment')
        }
    }

    const fetchAISuggestions = useCallback(async (commentText = null) => {
        if (!post) return
        setLoadingSuggestions(true)
        try {
            const { data } = await api.post('/ai/suggest-replies', {
                caption: post.caption,
                commentText
            })
            setSuggestions(data.data || [])
        } catch (err) {
            console.error('AI Suggestion error:', err)
        } finally {
            setLoadingSuggestions(false)
        }
    }, [post])

    useEffect(() => {
        if (replyingTo) {
            fetchAISuggestions(replyingTo.body)
        } else {
            setSuggestions([])
        }
    }, [replyingTo, fetchAISuggestions])

    if (loading) return <PostDetailSkeleton />

    if (notFound || !post) {
        return (
            <div className="empty-state-wrap">
                <div className="empty-state-icon">🕵️‍♂️</div>
                <h2 className="t-h2">Content Not Found</h2>
                <p className="t-body text-muted max-w-[300px]">This content might have been deleted or the link is incorrect.</p>
                <Link to="/" className="btn btn-primary btn-premium px-6 py-2.5">
                    Go Home
                </Link>
            </div>
        )
    }

    const author = post.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6366F1&color=fff`
    const isOwner = user?._id === (author._id || author)

    return (
        <>
            {/* Back header */}
            <div className="l-cluster gap-3 mb-4">
                <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon"><HiArrowLeft /></button>
                <span className="t-h3 font-bold">Post</span>
            </div>

            {/* Instagram split-view card */}
            <div className="post-detail-card">

                {/* ── LEFT: media ──────────────────────────── */}
                <div className="post-detail-media">
                    {post.mediaType === 'video'
                        ? <video src={post.mediaUrl} controls className="post-detail-video" />
                        : <img src={post.mediaUrl} alt={post.caption} className="post-detail-img" />
                    }
                </div>

                {/* ── RIGHT: info + comments ───────────────── */}
                <div className="post-detail-info">

                    {/* Header */}
                    <div className="post-detail-header">
                        <Link to={`/profile/${author._id}`}>
                            <img src={avatar} className="post-detail-avatar" alt="" />
                        </Link>
                        <div className="flex-1">
                            <div className="l-cluster gap-1 font-bold text-[14px]">
                                <Link to={`/profile/${author._id}`} className="text-primary no-underline">
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck className="text-accent text-[13px]" />}
                            </div>
                            <div className="text-[12px] text-muted">{timeago(post.createdAt)}</div>
                        </div>

                        {/* ··· menu */}
                        <div className="relative" ref={menuRef}>
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
                        <div className="post-detail-caption">
                            <img src={avatar} className="post-detail-caption-avatar" alt="" />
                            <div className="text-[14px] leading-6">
                                <strong className="mr-1.5">{author.username}</strong>
                                {post.caption}
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    <div className="post-detail-comments">
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
                                    <div id={`comment-${c._id}`} key={c._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 6px', borderRadius: 8 }}>
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
                                                {/* Delete: shown to comment author OR post owner */}
                                                {(String(user?._id) === String(c.author?._id || c.author) || String(user?._id) === String(post?.author?._id || post?.author)) && (
                                                    <button 
                                                        onClick={() => handleDeleteComment(c._id, false)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--error)', opacity: 0.7, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                        title="Delete comment"
                                                    >
                                                        <HiTrash size={12} />
                                                    </button>
                                                )}
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
                                                            <div id={`comment-${reply._id}`} key={reply._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 6px', borderRadius: 8 }}>
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
                                                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 10, alignItems: 'center' }}>
                                                                        <span>{timeago(reply.createdAt)}</span>
                                                                        {/* Delete reply: author or post owner */}
                                                                        {(String(user?._id) === String(reply.author?._id || reply.author) || String(user?._id) === String(post?.author?._id || post?.author)) && (
                                                                            <button 
                                                                                onClick={() => handleDeleteComment(reply._id, true, c._id)}
                                                                                style={{ background: 'none', border: 'none', color: 'var(--error)', opacity: 0.7, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                                                title="Delete reply"
                                                                            >
                                                                                <HiTrash size={11} />
                                                                            </button>
                                                                        )}
                                                                    </div>
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
                    <div className="post-detail-actions-wrap">
                        <div className="l-cluster gap-3.5 mb-2">
                            <motion.button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike} whileTap={{ scale: 0.85 }}>
                                {liked ? <HiHeart className="text-[24px]" /> : <HiOutlineHeart className="text-[24px]" />}
                            </motion.button>
                            <div className="relative" ref={emojiRef}>
                                <button className="post-action-btn" onClick={() => setShowEmojiPicker(p => !p)}>
                                    <HiEmojiHappy className="text-[22px]" />
                                </button>
                                {showEmojiPicker && (
                                    <div className="emoji-picker-popover">
                                        <EmojiPicker 
                                            theme="dark"
                                            onEmojiClick={(e) => setBody(prev => prev + e.emoji)}
                                        />
                                    </div>
                                )}
                            </div>
                            <button className="post-action-btn" onClick={handleShare}>
                                <HiShare className="text-[22px]" />
                            </button>
                            <motion.button className={`post-action-btn ${saved ? 'saved' : ''} ml-auto`} onClick={handleSave} whileTap={{ scale: 0.85 }}>
                                {saved ? <HiBookmark className="text-[22px]" /> : <HiOutlineBookmark className="text-[22px]" />}
                            </motion.button>
                        </div>
                        <div className="font-bold text-[13px] mb-1">{likesCount.toLocaleString()} likes</div>
                        <div className="text-[11px] text-muted mb-2.5">{timeago(post.createdAt)}</div>

                        {/* Comment input */}
                        <form onSubmit={handleComment} className="post-detail-comment-form">
                            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`}
                                className="post-detail-form-avatar" alt="" />
                            <div className="flex-1 relative">
                                {replyingTo && (
                                    <div className="post-detail-reply-badge">
                                        {/* AI Suggestions Chips */}
                                        {suggestions.length > 0 && (
                                            <div className="ai-suggestion-row no-scrollbar">
                                                {suggestions.map((s, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        onClick={() => setBody(s)}
                                                        type="button"
                                                        className="ai-suggestion-chip"
                                                        whileHover={{ background: 'var(--hover)', color: 'var(--text-1)', scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        {s}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}
                                        {loadingSuggestions && (
                                            <div className="ai-thinking-label">
                                                <div className="spinner w-[10px] h-[10px]" /> Thinking of replies...
                                            </div>
                                        )}
                                        <div className="text-[11px] text-muted">
                                            Replying to <strong>{replyingTo.author?.username}</strong>
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={inputRef}
                                    value={body} onChange={e => setBody(e.target.value)}
                                    placeholder={replyingTo ? 'Write a reply...' : 'Add a comment…'}
                                    className="post-detail-input" />
                            </div>
                            {body.trim() && (
                                <button type="submit" disabled={isScanning} className={`post-detail-submit ${isScanning ? 'is-scanning' : ''}`}>
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
