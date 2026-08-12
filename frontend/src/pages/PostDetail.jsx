import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import {
    HiHeart, HiOutlineHeart, HiBookmark, HiOutlineBookmark,
    HiDotsHorizontal, HiShare, HiPencil, HiTrash, HiArrowLeft,
    HiBadgeCheck,
    HiOutlineChat, HiPhotograph
} from 'react-icons/hi'
import { FiSend } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'
import EditPostModal from '../components/EditPostModal'
import ShareModal from '../components/ShareModal'
import ConfirmDialog from '../components/ConfirmDialog'

import { useQueryClient } from '@tanstack/react-query'

const COMMENT_PAGE_SIZE = 20

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

    // Comments were fetched with limit: 50 and no way to reach the rest, so any
    // thread longer than that was silently truncated.
    const [commentCursor, setCommentCursor] = useState(null)
    const [loadingMoreComments, setLoadingMoreComments] = useState(false)

    const [showShareModal, setShowShareModal] = useState(false)
    // Pending destructive action, replacing the blocking window.confirm() calls.
    // { kind: 'post' } or { kind: 'comment', commentId, isReply, parentId }.
    const [confirm, setConfirm] = useState(null)
    const inputRef = useRef()
    const menuRef = useRef()
    const mobileMenuRef = useRef()
    const commentsEndRef = useRef()

    // The scroll-into-view and focus timers below fired after unmount, calling
    // into refs that were already gone. Tracked so they can be cleared.
    const timeoutsRef = useRef([])
    const trackTimeout = useCallback((fn, ms) => {
        timeoutsRef.current.push(setTimeout(fn, ms))
    }, [])

    useEffect(() => () => {
        timeoutsRef.current.forEach(clearTimeout)
        timeoutsRef.current = []
    }, [])

    useEffect(() => {
        // This component instance is reused when navigating between two posts,
        // so the state has to be reset and the previous requests aborted.
        // Without that the old post stayed painted with no spinner, and if the
        // first response arrived last it overwrote the new one.
        const controller = new AbortController()

        setLoading(true)
        setNotFound(false)
        setPost(null)
        setComments([])
        setCommentCursor(null)

        Promise.all([
            api.get(`/posts/${id}`, { signal: controller.signal }),
            api.get(`/posts/${id}/comments`, { params: { limit: COMMENT_PAGE_SIZE }, signal: controller.signal }),
        ]).then(([{ data: pd }, { data: cd }]) => {
            setPost(pd.data)
            setLiked(pd.data.isLiked || false)
            setLikesCount(pd.data.likesCount || 0)
            setSaved(pd.data.isSaved || false)
            setComments(cd.data || [])
            setCommentCursor(cd.hasMore ? cd.nextCursor : null)
        }).catch((err) => {
            if (controller.signal.aborted) return
            console.error('Post Detail Error:', err)
            setNotFound(true)
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false)
        })

        return () => controller.abort()
    }, [id])



    useEffect(() => {
        if (!menuOpen) return
        const h = (e) => {
            if (menuRef.current?.contains(e.target)) return
            if (mobileMenuRef.current?.contains(e.target)) return
            setMenuOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [menuOpen])

    const loadMoreComments = async () => {
        if (!commentCursor || loadingMoreComments) return
        setLoadingMoreComments(true)
        try {
            const { data } = await api.get(`/posts/${id}/comments`, {
                params: { limit: COMMENT_PAGE_SIZE, cursor: commentCursor },
            })
            setComments((prev) => [...prev, ...(data.data || [])])
            setCommentCursor(data.hasMore ? data.nextCursor : null)
        } catch {
            toast.error('Could not load more comments')
        } finally {
            setLoadingMoreComments(false)
        }
    }

    const handleLike = async () => {
        if (!user) { toast.error('Please sign in to like posts'); return navigate('/login'); }
        const next = !liked;
        setLiked(next);
        // Floored: an optimistic decrement on a post whose count was already 0
        // (stale cache, double tap) used to render a negative like count.
        setLikesCount(c => next ? c + 1 : Math.max(0, c - 1));
        
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
            setLikesCount(c => next ? Math.max(0, c - 1) : c + 1);
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
        setShowShareModal(true)
    }

    const handleDelete = async () => {
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
                trackTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Failed to post comment') 
        } finally { 
            setIsScanning(false) 
        }
    }

    // Reads replyData through the functional setState form rather than closing
    // over it, so this callback keeps a stable identity. It used to depend on
    // replyData, which changes on every expand, and the highlight effect below
    // depends on this callback.
    const toggleReplies = useCallback(async (commentId) => {
        let needsFetch = false

        setReplyData(prev => {
            const current = prev[commentId]
            if (current?.show) return { ...prev, [commentId]: { ...current, show: false } }
            if (current?.replies) return { ...prev, [commentId]: { ...current, show: true } }
            needsFetch = true
            return { ...prev, [commentId]: { loading: true, show: true, replies: [] } }
        })

        if (!needsFetch) return

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
    }, [id])

    // Auto-scroll and flash the comment named in the URL, once.
    //
    // This used to depend on replyData and on toggleReplies (which itself
    // changed identity whenever replyData did), so expanding any reply thread
    // re-ran the highlight and yanked the scroll position back to the target
    // comment again. The ref makes it fire once per target, and the timeouts
    // are now cleared on unmount.
    const highlightedRef = useRef(null)

    useEffect(() => {
        if (!urlCommentId || comments.length === 0) return
        if (highlightedRef.current === urlCommentId) return

        const timers = []

        const executeHighlight = () => {
            const el = document.getElementById(`comment-${urlCommentId}`)
            if (!el) return
            highlightedRef.current = urlCommentId
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const originalBg = el.style.backgroundColor || 'transparent'
            el.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'
            el.style.transition = 'background-color 0.8s ease'
            timers.push(setTimeout(() => { el.style.backgroundColor = originalBg }, 2000))
        }

        if (urlParentId) {
            // Expand the parent thread first, then wait for the replies to paint.
            toggleReplies(urlParentId).then(() => {
                timers.push(setTimeout(executeHighlight, 400))
            })
        } else {
            executeHighlight()
        }

        return () => timers.forEach(clearTimeout)
    }, [comments, urlCommentId, urlParentId, toggleReplies])

    const handleDeleteComment = async (commentId, isReply, parentId) => {
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
            setPost(p => ({ ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }))
            toast.success('Comment deleted')
        } catch {
            toast.error('Failed to delete comment')
        }
    }



    if (loading) return (
        <div key="post-detail-skeleton" className="post-detail-card overflow-hidden">
            <div className="post-detail-media skeleton min-h-[400px] md:min-h-[600px]" />
            <div className="post-detail-info p-6 space-y-6 flex flex-col h-full">
                <div className="flex items-center gap-3 border-b border-border/10 pb-6">
                    <div className="skeleton size-10 rounded-full" />
                    <div className="skeleton h-4 w-32 rounded-md" />
                </div>
                <div className="flex-1 space-y-8 py-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4 items-start">
                            <div className="skeleton size-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2.5 pt-1">
                                <div className="skeleton h-3.5 w-1/4 rounded-md" />
                                <div className="skeleton h-3.5 w-full rounded-md" />
                                <div className="skeleton h-3.5 w-2/3 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-border/10 pt-6 space-y-4">
                    <div className="flex justify-between">
                        <div className="flex gap-4">
                            <div className="skeleton size-7 rounded-md" />
                            <div className="skeleton size-7 rounded-md" />
                            <div className="skeleton size-7 rounded-md" />
                        </div>
                        <div className="skeleton size-7 rounded-md" />
                    </div>
                    <div className="skeleton h-4 w-24 rounded-md" />
                </div>
            </div>
        </div>
    )

    if (notFound || !post) {
        return (
            <div className="empty-state-wrap">
                <div className="empty-state-icon"><HiPhotograph /></div>
                <h2 className="t-h2">Post not found</h2>
                <p className="t-body text-muted max-w-[320px]">It may have been deleted, or the link is wrong.</p>
                <Link to="/" className="btn btn-primary px-6 no-underline">
                    Back to feed
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
                <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon" aria-label="Go back"><HiArrowLeft /></button>
                <span className="t-h3 font-bold">Post</span>
            </div>

            {/* Instagram split-view card */}
            <div className={`post-detail-card ${!post.mediaUrl ? 'post-detail-card--text-only' : ''}`}>

            {/* ── MOBILE AUTHOR BAR (above image, hidden on desktop) ── */}
                <div className="post-mobile-author-bar" ref={mobileMenuRef}>
                    <Link to={`/profile/${author._id}`} aria-label={`${author.username}'s profile`}>
                        <img src={avatar} className="post-detail-avatar" alt="" />
                    </Link>
                    <div className="flex-1 flex items-center">
                        <div className="l-cluster gap-1 font-bold text-[14px]">
                            <Link to={`/profile/${author._id}`} className="text-primary no-underline hover:underline">
                                {author.username}
                            </Link>
                            {author.isVerified && <HiBadgeCheck className="text-accent text-[13px]" />}
                            <span style={{ color: 'var(--text-3)', fontWeight: 400, margin: '0 4px', fontSize: 12 }}>•</span>
                            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 13 }}>{timeago(post.createdAt)}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(o => !o)}><HiDotsHorizontal /></button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -6 }} transition={{ duration: 0.12 }}
                                    style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', minWidth: 170, overflow: 'hidden' }}>
                                    <button onClick={handleShare} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 14 }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <HiShare /> Copy link
                                    </button>
                                    {isOwner && (<>
                                        <button onClick={() => { setMenuOpen(false); setEditOpen(true) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 14 }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <HiPencil /> Edit post
                                        </button>
                                        <button onClick={() => { setMenuOpen(false); setConfirm({ kind: 'post' }) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <HiTrash /> Delete post
                                        </button>
                                    </>)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── LEFT: media ──────────────────────────── */}
                {post.mediaUrl ? (
                    <div className="post-detail-media">
                        {post.mediaType === 'video'
                            ? <video src={post.mediaUrl} controls className="post-detail-video" />
                            : <img src={post.mediaUrl} alt={post.caption} className="post-detail-img" />
                        }
                    </div>
                ) : (
                    <div className="post-detail-media post-detail-media--text">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', padding: '40px', textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, flexShrink: 0 }}>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                            </div>
                            {post.caption && (
                                <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.6, color: 'var(--text-1)', maxWidth: 380, wordWrap: 'break-word', margin: 0 }}>
                                    &ldquo;{post.caption}&rdquo;
                                </p>
                            )}
                            <div style={{ marginTop: 20, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>Text Post</div>
                        </div>
                    </div>
                )}

                {/* ── RIGHT: info + comments ───────────────── */}
                <div className="post-detail-info">

                    {/* Header, desktop only, hidden on mobile */}
                    {/* menuRef belongs on the menu wrapper below, not here. It
                        was assigned to both, so the second assignment won and
                        this one was dead; had it won instead, the outside-click
                        handler would have treated the whole header as inside
                        the menu and it would never close. */}
                    <div className="post-detail-header post-detail-header--desktop">
                        <Link to={`/profile/${author._id}`} aria-label={`${author.username}'s profile`}>
                            <img src={avatar} className="post-detail-avatar" alt="" />
                        </Link>
                        <div className="flex-1 flex items-center">
                            <div className="l-cluster gap-1 font-bold text-[14px]">
                                <Link to={`/profile/${author._id}`} className="text-primary no-underline hover:underline">
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck className="text-accent text-[13px]" />}
                                <span style={{ color: 'var(--text-3)', fontWeight: 400, margin: '0 4px', fontSize: 12 }}>•</span>
                                <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 13 }}>{timeago(post.createdAt)}</span>
                            </div>
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
                                                <button onClick={() => { setMenuOpen(false); setConfirm({ kind: 'post' }) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}
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
                        <div className="post-detail-caption" style={{ padding: '14px 16px 4px', borderBottom: 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Link to={`/profile/${author._id}`} aria-label={`${author.username}'s profile`}>
                                <img src={avatar} className="post-detail-caption-avatar" style={{ width: 32, height: 32, marginTop: 2, flexShrink: 0 }} alt="" />
                            </Link>
                            <div style={{ fontSize: 14, lineHeight: 1.5, wordWrap: 'break-word', flex: 1 }}>
                                <strong style={{ marginRight: 6 }}>
                                    <Link to={`/profile/${author._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }} className="hover:underline">
                                        {author.username}
                                    </Link>
                                </strong>
                                <span style={{ color: 'var(--text-1)' }}>{post.caption}</span>
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
                                    <div id={`comment-${c._id}`} key={c._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '6px 0', borderRadius: 8 }}>
                                        <Link to={`/profile/${c.author?._id}`} aria-label={`${c.author?.username}'s profile`}>
                                            <img src={cav} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', marginTop: 2 }} alt="" />
                                        </Link>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, lineHeight: 1.5, wordWrap: 'break-word' }}>
                                                <strong style={{ marginRight: 6 }}>
                                                    <Link to={`/profile/${c.author?._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }} className="hover:underline">
                                                        {c.author?.username}
                                                    </Link>
                                                </strong>
                                                <span style={{ color: 'var(--text-1)' }}>{c.body}</span>

                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <span>{timeago(c.createdAt)}</span>
                                                <button 
                                                    onClick={() => {
                                                        if (!user) { toast.error('Please sign in to reply'); return navigate('/login'); }
                                                        setReplyingTo(replyingTo?._id === c._id ? null : c);
                                                        if (replyingTo?._id !== c._id) trackTimeout(() => inputRef.current?.focus(), 10);
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: replyingTo?._id === c._id ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    {replyingTo?._id === c._id ? 'Cancel reply' : 'Reply'}
                                                </button>
                                                {/* Delete: shown to comment author OR post owner */}
                                                {(String(user?._id) === String(c.author?._id || c.author) || String(user?._id) === String(post?.author?._id || post?.author)) && (
                                                    <button 
                                                        onClick={() => setConfirm({ kind: 'comment', commentId: c._id, isReply: false })}
                                                        style={{ background: 'none', border: 'none', color: 'var(--error)', opacity: 0.7, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                        title="Delete comment"
                                                    >
                                                        <HiTrash size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Replies Toggle */}
                                            <div style={{ marginTop: 12, marginBottom: 4 }}>
                                                <button 
                                                    onClick={() => toggleReplies(c._id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                    className="hover:opacity-80"
                                                >
                                                    <div style={{ width: 24, height: 1, background: 'var(--border-md)' }} />
                                                    {replyData[c._id]?.loading ? 'Loading...' : replyData[c._id]?.show ? 'Hide replies' : 'View replies'}
                                                </button>
                                            </div>

                                            {/* Replies List */}
                                            {replyData[c._id]?.show && (
                                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {replyData[c._id]?.replies?.map(reply => {
                                                        const rav = reply.author?.avatarUrl || `https://ui-avatars.com/api/?name=${reply.author?.username}&background=6366F1&color=fff`
                                                        return (
                                                            <div id={`comment-${reply._id}`} key={reply._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0', borderRadius: 8 }}>
                                                                <Link to={`/profile/${reply.author?._id}`} aria-label={`${reply.author?.username}'s profile`}>
                                                                    <img src={rav} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', marginTop: 2 }} alt="" />
                                                                </Link>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: 14, lineHeight: 1.5, wordWrap: 'break-word' }}>
                                                                        <strong style={{ marginRight: 6 }}>
                                                                            <Link to={`/profile/${reply.author?._id}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }} className="hover:underline">
                                                                                {reply.author?.username}
                                                                            </Link>
                                                                        </strong>
                                                                        <span style={{ color: 'var(--text-1)' }}>{reply.body}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 10, alignItems: 'center' }}>
                                                                        <span>{timeago(reply.createdAt)}</span>
                                                                        {/* Delete reply: author or post owner */}
                                                                        {(String(user?._id) === String(reply.author?._id || reply.author) || String(user?._id) === String(post?.author?._id || post?.author)) && (
                                                                            <button 
                                                                                onClick={() => setConfirm({ kind: 'comment', commentId: reply._id, isReply: true, parentId: c._id })}
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
                        {commentCursor && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm comments-load-more"
                                onClick={loadMoreComments}
                                disabled={loadingMoreComments}
                            >
                                {loadingMoreComments ? 'Loading…' : 'Load more comments'}
                            </button>
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Action bar */}
                    <div className="post-detail-actions-wrap">
                        <div className="flex items-center justify-between w-full mb-3">
                            <div className="flex items-center gap-4">
                                <motion.button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike} whileTap={{ scale: 0.85 }}>
                                    {liked ? <HiHeart size={28} /> : <HiOutlineHeart size={28} />}
                                </motion.button>
                                <button className="post-action-btn" onClick={() => inputRef.current?.focus()} aria-label="Write a comment">
                                    <HiOutlineChat size={28} />
                                </button>
                                <button className="post-action-btn relative top-[1px]" onClick={handleShare} aria-label="Share this post">
                                    <FiSend size={28} />
                                </button>
                            </div>
                            
                            <motion.button className={`post-action-btn ${saved ? 'saved' : ''}`} onClick={handleSave} whileTap={{ scale: 0.85 }}>
                                {saved ? <HiBookmark size={28} /> : <HiOutlineBookmark size={28} />}
                            </motion.button>
                        </div>
                        <div className="font-bold text-[14px] mb-1">{likesCount.toLocaleString()} likes</div>
                        <div className="text-[11px] text-muted mb-2.5">{timeago(post.createdAt)}</div>

                        {/* Comment input */}
                        <form onSubmit={handleComment} className="post-detail-comment-form">
                            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`}
                                className="post-detail-form-avatar" alt="" />
                            <div className="flex-1 relative">
                                {replyingTo && (
                                    <div className="post-detail-reply-badge">
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
                                <button type="submit" disabled={isScanning} className="post-detail-submit">
                                    Post
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

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                postId={post?._id}
            />

            {confirm && (
                <ConfirmDialog
                    title={confirm.kind === 'post' ? 'Delete this post?' : 'Delete this comment?'}
                    body={confirm.kind === 'post'
                        ? 'This removes the post along with its comments, likes and saves. It cannot be undone.'
                        : 'This removes the comment and any replies to it. It cannot be undone.'}
                    onConfirm={() => {
                        if (confirm.kind === 'post') handleDelete()
                        else handleDeleteComment(confirm.commentId, confirm.isReply, confirm.parentId)
                    }}
                    onClose={() => setConfirm(null)}
                />
            )}
        </>
    )
}
