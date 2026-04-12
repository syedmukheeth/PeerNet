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
    const [isLikePending, setIsLikePending] = useState(false)
    const pendingLike = useRef(false) // true while a like/unlike API call is in-flight
    const localLiked = useRef(null)     // user's intended liked state; null = defer to server
    const localCount = useRef(null)     // user's intended count; null = defer to server
    const [lastTap, setLastTap] = useState(0)
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [caption, setCaption] = useState(post.caption || '')
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
        setIsLikePending(true)
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
            setIsLikePending(false)
            pendingLike.current = false
        }
    }

    const handleImageTap = () => {
        const now = Date.now()
        // Double-tap to like only — never double-tap to unlike
        if (now - lastTap < 350 && !liked) handleLike()
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
            <motion.div className="post-card"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ overflow: 'hidden', position: 'relative' }}>
                
                {/* Header with glass effect */}
                <div className="post-header glass-header" style={{ padding: '12px 14px' }}>
                    <Link to={`/profile/${author._id}`} style={{ position: 'relative' }}>
                        <img src={avatarUrl} className="avatar" style={{ width: 38, height: 38, border: '1.5px solid var(--border-md)' }} alt={author.username} />
                    </Link>
                    <div style={{ flex: 1, marginLeft: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Link to={`/profile/${author._id}`} className="post-author-name" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{author.username}</Link>
                            {author.isVerified && <HiBadgeCheck className="verified" style={{ fontSize: 14 }} title="Verified" />}
                        </div>
                        <div className="post-author-time" style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeago(post.createdAt)}</div>
                    </div>
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <motion.button className="btn btn-ghost btn-icon-sm"
                            whileHover={{ background: 'var(--btn-glass-hover)' }} whileTap={{ scale: 0.9 }}
                            onClick={() => setMenuOpen(o => !o)}>
                            <HiDotsHorizontal style={{ fontSize: 18, color: 'var(--text-3)' }} />
                        </motion.button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div className="post-options-menu glass-card"
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ border: '1px solid var(--border-md)', boxShadow: 'var(--shadow-lg)' }}>
                                    {isOwner ? (
                                        <>
                                            <button className="post-options-item" onClick={() => { setMenuOpen(false); setEditOpen(true) }}>
                                                <HiPencil /> Edit caption
                                            </button>
                                            <div className="ig-more-divider" style={{ margin: '4px 0', opacity: 0.5 }} />
                                            <button className="post-options-item danger" onClick={() => { setMenuOpen(false); handleDelete() }}>
                                                <HiTrash /> Delete post
                                            </button>
                                        </>
                                    ) : (
                                        <button className="post-options-item" onClick={() => { toast('Report coming soon'); setMenuOpen(false) }}>
                                            Report
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Media */}
                <div className="post-media-wrap">
                    {post.mediaType === 'video' ? (
                        <div style={{ position: 'relative', background: '#000' }}>
                            <video
                                ref={videoRef}
                                src={post.mediaUrl}
                                className="post-media-video"
                                muted={isMuted}
                                loop
                                playsInline
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onClick={(e) => { e.stopPropagation(); handleImageTap(); }}
                            />
                            {/* Mute toggle */}
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMuted(!isMuted) }}
                                style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                            >
                                {isMuted ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
                            </button>
                            {!isPlaying && (
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: 14, pointerEvents: 'none', color: '#fff', display: 'flex', zIndex: 2 }}>
                                    <HiPlay size={28} style={{ marginLeft: 3 }} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to={`/posts/${post._id}`} onClick={e => e.stopPropagation()} style={{ display: 'block' }}>
                            <img src={optimizeCloudinaryUrl(post.mediaUrl)} className="post-media" alt={post.caption} loading="lazy" onClick={handleImageTap} />
                        </Link>
                    )}
                </div>

                {/* Actions with glass effect */}
                <div className="post-actions glass-footer" style={{ padding: '8px 12px', marginTop: 0 }}>
                    <motion.button className={`post-action-btn ${liked ? 'liked' : ''}`}
                        onClick={handleLike}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}>
                        {liked
                            ? <HiHeart style={{ fontSize: 24, color: 'var(--error)' }} />
                            : <HiOutlineHeart style={{ fontSize: 24 }} />
                        }
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{likesCount.toLocaleString()}</span>
                    </motion.button>

                    <Link to={`/posts/${post._id}`} className="post-action-btn" style={{ padding: '6px 10px' }}>
                        <HiChatAlt2 style={{ fontSize: 22 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{post.commentsCount || 0}</span>
                    </Link>

                    <motion.button className="post-action-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            const url = `${window.location.origin}/posts/${post._id}`
                            if (navigator.share) {
                                navigator.share({ title: 'PeerNet post', url })
                            } else {
                                navigator.clipboard.writeText(url)
                                    .then(() => toast.success('Link copied!'))
                                    .catch(() => toast.error('Copy failed'))
                            }
                        }}>
                        <HiShare style={{ fontSize: 22 }} />
                    </motion.button>

                    <motion.button className={`post-action-btn ${saved ? 'saved' : ''}`}
                        onClick={handleSave}
                        style={{ marginLeft: 'auto' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}>
                        {saved
                            ? <HiBookmark style={{ fontSize: 22, color: 'var(--accent)' }} />
                            : <HiOutlineBookmark style={{ fontSize: 22 }} />
                        }
                    </motion.button>
                </div>

                {likesCount > 0 && (
                    <div className="post-likes">{likesCount.toLocaleString()} likes</div>
                )}
                {caption && (
                    <div className="post-caption">
                        <strong>{author.username}</strong>{' '}{caption}
                    </div>
                )}
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
