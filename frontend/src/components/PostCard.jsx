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
            <motion.div className="l-card-premium relative"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}>
                
                {/* Header: Clean & Balanced */}
                <div className="l-cluster px-4 py-3 justify-between">
                    <div className="l-cluster gap-3">
                        <Link to={`/profile/${author._id}`} className="relative shrink-0">
                            <img src={avatarUrl} className="avatar w-10 h-10 border-[1.5px] border-border-md" alt={author.username} />
                        </Link>
                        <div className="l-stack l-stack-sm">
                            <div className="l-cluster gap-1.5">
                                <Link to={`/profile/${author._id}`} className="t-h3 no-underline hover:underline font-bold truncate">
                                    {author.username}
                                </Link>
                                {author.isVerified && <HiBadgeCheck className="text-accent text-sm shrink-0" title="Verified" />}
                            </div>
                            <div className="t-caption text-muted">{timeago(post.createdAt)}</div>
                        </div>
                    </div>
                    <div className="relative" ref={menuRef}>
                        <motion.button className="btn btn-ghost btn-icon-sm"
                            whileHover={{ background: 'var(--btn-glass-hover)' }} whileTap={{ scale: 0.9 }}
                            onClick={() => setMenuOpen(o => !o)}>
                            <HiDotsHorizontal className="text-[18px] text-muted" />
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

                {/* Media / Text Content */}
                <div className="post-media-wrap">
                    {post.mediaType === 'text' ? (
                        <div className="cursor-pointer min-h-[280px] max-h-[400px] flex items-center justify-center p-8 text-center text-white text-[22px] font-extrabold font-syne shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"
                            style={{ background: post.backgroundColor || 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' }}
                            onClick={handleImageTap}>
                            <div className="whitespace-pre-wrap break-words">
                                {post.caption}
                            </div>
                        </div>
                    ) : post.mediaType === 'video' ? (
                        <div className="relative bg-black">
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
                                className="absolute bottom-3 right-3 bg-black/60 text-white border-none rounded-full p-2 cursor-pointer flex items-center justify-center z-10"
                            >
                                {isMuted ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
                            </button>
                            {!isPlaying && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-full p-3.5 pointer-events-none text-white flex z-10">
                                    <HiPlay size={28} className="ml-[3px]" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to={`/posts/${post._id}`} onClick={e => e.stopPropagation()} style={{ display: 'block' }}>
                            <img src={optimizeCloudinaryUrl(post.mediaUrl)} className="post-media" alt={post.caption} loading="lazy" onClick={handleImageTap} />
                        </Link>
                    )}
                </div>

                {/* Actions: Elegant & Functional */}
                <div className="l-cluster px-4 py-3 justify-between">
                    <div className="l-cluster gap-4">
                        <motion.button 
                            className={`l-cluster gap-2 transition-colors ${liked ? 'text-error' : 'hover:text-error'}`}
                            onClick={handleLike}
                            whileTap={{ scale: 0.9 }}>
                            {liked
                                ? <HiHeart className="text-[26px]" />
                                : <HiOutlineHeart className="text-[26px]" />
                            }
                            <span className="t-h3 font-bold">{likesCount.toLocaleString()}</span>
                        </motion.button>
    
                        <Link to={`/posts/${post._id}`} className="l-cluster gap-2 no-underline text-current hover:text-accent">
                            <HiChatAlt2 className="text-[26px]" />
                            <span className="t-h3 font-bold">{post.commentsCount || 0}</span>
                        </Link>
    
                        <motion.button 
                            className="hover:text-accent transition-colors"
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
                            <HiShare size={24} />
                        </motion.button>
                    </div>

                    <motion.button 
                        className={`transition-colors ${saved ? 'text-accent' : 'hover:text-accent'}`}
                        onClick={handleSave}
                        whileTap={{ scale: 0.9 }}>
                        {saved
                            ? <HiBookmark className="text-[26px]" />
                            : <HiOutlineBookmark className="text-[26px]" />
                        }
                    </motion.button>
                </div>

                {likesCount > 0 && (
                    <div className="px-4 py-1 t-h3">{likesCount.toLocaleString()} likes</div>
                )}
                {caption && post.mediaType !== 'text' && (
                    <div className="px-4 pb-4 t-body">
                        <strong className="text-primary pr-1">{author.username}</strong>{caption}
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
