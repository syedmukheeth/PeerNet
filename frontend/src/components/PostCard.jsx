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
                className="l-post-card glass-card"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    delay: 0.05
                }}
            >
                
                {/* ── Post Header ────────────────── */}
                <header className="post-card-header">
                    <div className="post-card-user">
                        <Link to={`/profile/${author._id}`} className="post-card-avatar-link">
                            <img 
                                src={avatarUrl} 
                                className="post-card-avatar" 
                                alt={author.username} 
                                loading="lazy"
                            />
                        </Link>
                        <div className="post-card-user-meta">
                            <div className="post-card-user-row">
                                <Link to={`/profile/${author._id}`} className="post-card-username">
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck className="post-card-verified" />}
                                <span className="post-card-dot">•</span>
                                <time className="post-card-time">{timeago(post.createdAt)}</time>
                            </div>
                            {post.location && (
                                <span className="post-card-location">{post.location}</span>
                            )}
                        </div>
                    </div>
                    <div className="post-card-menu-wrap" ref={menuRef}>
                        <button className="post-card-menu-btn" onClick={() => setMenuOpen(o => !o)}>
                            <HiDotsHorizontal />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div 
                                    className="post-card-menu-dropdown"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                >
                                    {isOwner ? (
                                        <>
                                            <button className="post-card-menu-item" onClick={() => { setMenuOpen(false); setEditOpen(true) }}>
                                                <HiPencil size={16} /> <span>Edit</span>
                                            </button>
                                            <button className="post-card-menu-item text-error" onClick={() => { setMenuOpen(false); handleDelete() }}>
                                                <HiTrash size={16} /> <span>Delete</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button className="post-card-menu-item" onClick={() => { toast.success('Reported'); setMenuOpen(false) }}>
                                            Report
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* ── Post Media ─────────────────── */}
                <div className="post-card-media-wrap" onClick={handleImageTap}>
                    <AnimatePresence>
                        {showHeart && (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.7 }}
                                className="post-card-heart-overlay"
                            >
                                <HiHeart size={80} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {post.mediaType === 'text' ? (
                        <div className="post-card-text-content" style={{ background: post.backgroundColor || 'var(--accent-gradient)' }}>
                            <div className="post-card-text-inner">{post.caption}</div>
                        </div>
                    ) : post.mediaType === 'video' ? (
                        <div className="post-card-video-wrap">
                            <video ref={videoRef} src={post.mediaUrl} className="post-card-media" muted={isMuted} loop playsInline />
                            <button className="post-card-video-toggle" onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}>
                                {isMuted ? <HiVolumeOff size={16} /> : <HiVolumeUp size={16} />}
                            </button>
                            {!isPlaying && <HiPlay size={40} className="post-card-video-play-hint" />}
                        </div>
                    ) : (
                        <img src={optimizeCloudinaryUrl(post.mediaUrl)} className="post-card-media" alt="" loading="lazy" />
                    )}
                </div>

                {/* ── Post Actions ───────────────── */}
                <div className="post-card-actions">
                    <div className="post-card-actions-left">
                        <button className={`post-card-action-btn ${liked ? 'is-liked' : ''}`} onClick={handleLike}>
                            {liked ? <HiHeart size={26} /> : <HiOutlineHeart size={26} />}
                        </button>
                        <Link to={`/posts/${post._id}`} className="post-card-action-btn">
                            <HiChatAlt2 size={24} />
                        </Link>
                        <button className="post-card-action-btn" onClick={() => {
                            const url = `${window.location.origin}/posts/${post._id}`
                            navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
                        }}>
                            <HiShare size={22} />
                        </button>
                    </div>
                    <button className={`post-card-action-btn ${saved ? 'is-saved' : ''}`} onClick={handleSave}>
                        {saved ? <HiBookmark size={24} /> : <HiOutlineBookmark size={24} />}
                    </button>
                </div>

                {/* ── Post Footer ────────────────── */}
                <footer className="post-card-footer">
                    <div className="post-card-engagement">
                        {likesCount > 0 && (
                            <span className="post-card-likes">
                                {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
                            </span>
                        )}
                    </div>
                    
                    {caption && post.mediaType !== 'text' && (
                        <div className="post-card-caption">
                            <Link to={`/profile/${author._id}`} className="post-card-caption-author">
                                {author.username}
                            </Link>
                            <span className="post-card-caption-text">{caption}</span>
                        </div>
                    )}

                    {post.commentsCount > 0 && (
                        <Link to={`/posts/${post._id}`} className="post-card-comments-link">
                            View all {post.commentsCount} comments
                        </Link>
                    )}
                </footer>
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
