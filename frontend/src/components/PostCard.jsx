import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiHeart, HiOutlineHeart, HiChatAlt2,
    HiBookmark, HiOutlineBookmark, HiDotsHorizontal, HiBadgeCheck,
    HiPencil, HiTrash, HiShare,
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'
import EditPostModal from './EditPostModal'

export default function PostCard({ post, onLikeToggle, onDelete, onUpdate }) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(post.isLiked || false)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [saved, setSaved] = useState(post.isSaved || false)
    const [lastTap, setLastTap] = useState(0)
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [caption, setCaption] = useState(post.caption || '')
    const menuRef = useRef(null)
    const isOwner = user?._id === (post.author?._id || post.author)

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [menuOpen])

    const handleLike = async () => {
        const newLiked = !liked
        setLiked(newLiked)
        const newCount = newLiked ? likesCount + 1 : likesCount - 1
        setLikesCount(newCount)
        onLikeToggle?.(post._id, newLiked, newCount)
        try {
            if (newLiked) await api.post(`/posts/${post._id}/like`)
            else await api.delete(`/posts/${post._id}/like`)
        } catch { setLiked(!newLiked); setLikesCount(likesCount) }
    }

    const handleImageTap = () => {
        const now = Date.now()
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
    const avatarUrl = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6366F1&color=fff`

    return (
        <>
            <motion.div className="post-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}>
                {/* Header */}
                <div className="post-header">
                    <Link to={`/profile/${author._id}`}>
                        <img src={avatarUrl} className="avatar avatar-md" alt={author.username} />
                    </Link>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Link to={`/profile/${author._id}`} className="post-author-name">{author.username}</Link>
                            {author.isVerified && <HiBadgeCheck className="verified" />}
                        </div>
                        <div className="post-author-time">{timeago(post.createdAt)}</div>
                    </div>
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <motion.button className="btn btn-ghost btn-icon-sm"
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => setMenuOpen(o => !o)}>
                            <HiDotsHorizontal style={{ fontSize: 18 }} />
                        </motion.button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div className="post-options-menu"
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}>
                                    {isOwner ? (
                                        <>
                                            <button className="post-options-item" onClick={() => { setMenuOpen(false); setEditOpen(true) }}>
                                                <HiPencil /> Edit caption
                                            </button>
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
                <div className="post-media-wrap" onClick={handleImageTap} style={{ cursor: 'pointer' }}>
                    <Link to={`/posts/${post._id}`} onClick={e => e.stopPropagation()}>
                        {post.mediaType === 'video'
                            ? <video src={post.mediaUrl} className="post-media-video" controls muted loop playsInline />
                            : <img src={post.mediaUrl} className="post-media" alt={post.caption} loading="lazy" />
                        }
                    </Link>
                </div>

                {/* Actions */}
                <div className="post-actions">
                    <motion.button className={`post-action-btn ${liked ? 'liked' : ''}`}
                        onClick={handleLike}
                        whileTap={{ scale: 0.85 }}>
                        {liked
                            ? <HiHeart style={{ fontSize: 23 }} />
                            : <HiOutlineHeart style={{ fontSize: 23 }} />
                        }
                        <span>{likesCount.toLocaleString()}</span>
                    </motion.button>

                    <Link to={`/posts/${post._id}`} className="post-action-btn">
                        <HiChatAlt2 style={{ fontSize: 21 }} />
                        <span>{post.commentsCount || 0}</span>
                    </Link>

                    {/* Share button */}
                    <motion.button className="post-action-btn"
                        whileTap={{ scale: 0.85 }}
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
                        <HiShare style={{ fontSize: 21 }} />
                    </motion.button>

                    <motion.button className={`post-action-btn ${saved ? 'saved' : ''}`}
                        onClick={handleSave}
                        style={{ marginLeft: 'auto' }}
                        whileTap={{ scale: 0.85 }}>
                        {saved
                            ? <HiBookmark style={{ fontSize: 21 }} />
                            : <HiOutlineBookmark style={{ fontSize: 21 }} />
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
