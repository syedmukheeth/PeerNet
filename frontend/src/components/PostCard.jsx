import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import {
    HiHeart, HiOutlineHeart, HiChatAlt2,
    HiBookmark, HiOutlineBookmark, HiDotsHorizontal, HiBadgeCheck,
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { timeago } from '../utils/timeago'

export default function PostCard({ post, onLikeToggle }) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(post.isLiked || false)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [saved, setSaved] = useState(post.isSaved || false)
    const [lastTap, setLastTap] = useState(0)

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

    const author = post.author || {}
    const avatarUrl = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6366F1&color=fff`

    return (
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
                <motion.button className="btn btn-ghost btn-icon-sm" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <HiDotsHorizontal style={{ fontSize: 18 }} />
                </motion.button>
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
            {post.caption && (
                <div className="post-caption">
                    <strong>{author.username}</strong>{' '}{post.caption}
                </div>
            )}
        </motion.div>
    )
}
