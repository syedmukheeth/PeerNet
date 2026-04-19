import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiHeart, HiOutlineHeart, HiChatAlt2,
    HiBookmark, HiOutlineBookmark, HiDotsHorizontal, HiBadgeCheck,
    HiPencil, HiTrash, HiShare, HiPlay, HiVolumeUp, HiVolumeOff
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'
import { optimizeAvatarUrl, optimizeCloudinaryUrl } from '../utils/cloudinary'
import EditPostModal from './EditPostModal'

export default function PostCard({ post, onLikeToggle, onDelete, onUpdate }) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(post.isLiked || false)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [saved, setSaved] = useState(post.isSaved || false)
    const pendingLike = useRef(false) // true while a like/unlike API call is in-flight
    const localLiked = useRef(null)     // user's intended liked state; null = defer to server
    const localCount = useRef(null)     // user's intended count; null = defer to server
    const [lastTap, setLastTap] = useState(0)
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [caption, setCaption] = useState(post.caption || '')
    const [showHeart, setShowHeart] = useState(false)
    const menuRef = useRef(null)
    const isOwner = user?._id === (post.author?._id || post.author)

    // Sync liked state from server data, but only when no local override is active
    useEffect(() => {
        if (localLiked.current !== null && !pendingLike.current) {
            // If server finally matches our local intent, we can release the override
            if (post.isLiked === localLiked.current) {
                localLiked.current = null;
                localCount.current = null;
            }
        }

        if (localLiked.current === null) {
            setLiked(post.isLiked || false)
            setLikesCount(post.likesCount || 0)
        } else {
            // Keep the local override visible
            setLiked(localLiked.current)
            setLikesCount(localCount.current)
        }
    }, [post.isLiked, post.likesCount])

    // ── Video Player State ────────────────────────────────────────────────────────
    const videoRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(true)

    useEffect(() => {
        if (post.mediaType !== 'video' || !videoRef.current) return
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0]
            if (entry.isIntersecting) {
                videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => { })
            } else {
                videoRef.current?.pause()
                setIsPlaying(false)
            }
        }, { threshold: 0.6 })
        observer.observe(videoRef.current)
        return () => observer.disconnect()
    }, [post.mediaType])

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [menuOpen])

    const handleLike = async () => {
        const newLiked = !liked
        pendingLike.current = true
        localLiked.current = newLiked
        const newCount = newLiked ? likesCount + 1 : likesCount - 1
        localCount.current = newCount
        
        setLiked(newLiked)
        setLikesCount(newCount)
        onLikeToggle?.(post._id, newLiked, newCount)
        try {
            if (newLiked) await api.post(`/posts/${post._id}/like`)
            else await api.delete(`/posts/${post._id}/like`)
        } catch (err) {
            if (err.response?.status === 409) {
                localLiked.current = true
                localCount.current = likesCount + 1
                setLiked(true)
                setLikesCount(likesCount + 1)
                onLikeToggle?.(post._id, true, likesCount + 1)
            } else {
                // genuine error — revert local override
                localLiked.current = !newLiked
                localCount.current = likesCount
                setLiked(!newLiked)
                setLikesCount(likesCount)
                onLikeToggle?.(post._id, !newLiked, likesCount)
            }
        } finally {
            pendingLike.current = false
        }
    }

    const handleImageTap = () => {
        const now = Date.now()
        if (now - lastTap < 350) {
            if (!liked) handleLike()
            setShowHeart(true)
            setTimeout(() => setShowHeart(false), 800)
        }
        setLastTap(now)
    }

    const handleSave = async () => {
        const newSaved = !saved; setSaved(newSaved)
        try {
            if (newSaved) { await api.post(`/posts/${post._id}/save`); toast.success('Saved') }
            else { await api.delete(`/posts/${post._id}/save`) }
        } catch { setSaved(!newSaved) }
    }

    const handleDelete = async () => {
        if (!window.confirm('Delete this post?')) return
        try {
            await api.delete(`/posts/${post._id}`)
            toast.success('Post deleted')
            onDelete?.(post._id)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete post')
        }
    }

    const author = post.author || {}
    const rawAvatarUrl = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6366F1&color=fff`
    const avatarUrl = optimizeAvatarUrl(rawAvatarUrl)

    return (
        <>
            <motion.div 
                className="l-card-premium l-post-card overflow-hidden"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}>
                
                {/* ── Header: Identity & Context ── */}
                <div className="l-cluster px-4 py-3 justify-between">
                    <div className="l-cluster gap-3">
                        <Link to={`/profile/${author._id}`} className="shrink-0">
                            <img src={avatarUrl} className="avatar w-10 h-10 border border-border-md" alt={author.username} />
                        </Link>
                        <div className="l-stack" style={{ gap: '1px' }}>
                            <div className="l-cluster gap-1.5 flex-nowrap">
                                <Link to={`/profile/${author._id}`} className="t-h4 no-underline hover:underline font-bold text-primary truncate max-w-[140px]">
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck className="post-verified" />}
                                <span className="text-muted text-[12px] opacity-40">•</span>
                                <span className="post-timestamp">{timeago(post.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button className="btn btn-ghost btn-icon-sm p-1" onClick={() => setMenuOpen(o => !o)}>
                            <HiDotsHorizontal className="text-[20px] text-muted" />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div 
                                    className="post-options-menu glass-card p-1"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{ right: 0, top: '100%', border: '1px solid var(--border-md)', minWidth: '160px', position: 'absolute' }}
                                >
                                    {isOwner ? (
                                        <>
                                            <button className="post-options-item" onClick={() => { setMenuOpen(false); setEditOpen(true) }}>
                                                <HiPencil size={18} /> <span>Edit post</span>
                                            </button>
                                            <div className="ig-more-divider" />
                                            <button className="post-options-item text-error" onClick={() => { setMenuOpen(false); handleDelete() }}>
                                                <HiTrash size={18} /> <span>Delete post</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button className="post-options-item" onClick={() => { toast('Reported successfully'); setMenuOpen(false) }}>
                                            Report inappropriate
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Media: Premium Visual Fit ── */}
                <div className="post-media-container bg-black" onClick={handleImageTap}>
                    <AnimatePresence>
                        {showHeart && (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.8 }}
                                className="absolute z-10 text-white drop-shadow-xl"
                            >
                                <HiHeart size={80} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {post.mediaType === 'text' ? (
                        <div className="w-full h-full min-h-[360px] flex items-center justify-center p-12 text-center text-white text-[24px] font-black font-syne"
                            style={{ background: post.backgroundColor || 'var(--accent-gradient)' }}>
                            <div className="whitespace-pre-wrap">{post.caption}</div>
                        </div>
                    ) : post.mediaType === 'video' ? (
                        <div className="relative w-full h-full">
                            <video ref={videoRef} src={post.mediaUrl} className="post-media" muted={isMuted} loop playsInline />
                            <button className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md text-white rounded-full p-2" onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}>
                                {isMuted ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
                            </button>
                            {!isPlaying && <HiPlay size={50} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />}
                        </div>
                    ) : (
                        <img src={optimizeCloudinaryUrl(post.mediaUrl)} className="post-media" alt="" loading="lazy" />
                    )}
                </div>

                {/* ── Actions: Immediate Feedback ── */}
                <div className="post-action-row px-4 py-2">
                    <div className="l-cluster gap-4">
                        <button className={`post-action-btn ${liked ? 'active-heart' : ''}`} onClick={handleLike}>
                            {liked ? <HiHeart size={28} /> : <HiOutlineHeart size={28} />}
                        </button>
                        <Link to={`/posts/${post._id}`} className="post-action-btn no-underline text-current">
                            <HiChatAlt2 size={26} />
                        </Link>
                        <button className="post-action-btn" onClick={() => {
                            const url = `${window.location.origin}/posts/${post._id}`
                            navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
                        }}>
                            <HiShare size={24} />
                        </button>
                    </div>
                    <button className={`post-action-btn ${saved ? 'active-save' : ''}`} onClick={handleSave}>
                        {saved ? <HiBookmark size={26} /> : <HiOutlineBookmark size={26} />}
                    </button>
                </div>

                {/* ── Footer: Engagement & Caption ── */}
                <div className="post-footer-content px-4 pb-4">
                    <div className="t-h4 font-bold text-primary mb-1">
                        {likesCount > 0 ? `${likesCount.toLocaleString()} likes` : 'Be the first to like'}
                    </div>
                    
                    {caption && post.mediaType !== 'text' && (
                        <div className="t-body text-[14.5px] leading-snug">
                            <span className="post-caption-author">{author.username}</span>
                            {caption}
                        </div>
                    )}

                    {post.commentsCount > 0 && (
                        <Link to={`/posts/${post._id}`} className="post-comments-preview no-underline block mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            View all {post.commentsCount} comments
                        </Link>
                    )}
                </div>
            </motion.div>
            {editOpen && (
                <EditPostModal
                    post={{ ...post, caption }}
                    onClose={() => setEditOpen(false)}
                    onSave={(updated) => {
                        setCaption(updated.caption)
                        onUpdate?.(post._id, updated)
                        setEditOpen(false)
                    }}
                />
            )}
        </>
    )
}
