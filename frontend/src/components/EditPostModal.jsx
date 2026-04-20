import { useState } from 'react'
import { motion } from 'framer-motion'
import { HiX } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function EditPostModal({ post, onClose, onSave }) {
    const [caption, setCaption] = useState(post.caption || '')
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        try {
            const { data } = await api.patch(`/posts/${post._id}`, { caption })
            toast.success('Caption updated!')
            onSave(data.data)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal-card"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 className="t-heading" style={{ fontSize: 17 }}>Edit Caption</h2>
                    <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <HiX style={{ fontSize: 18 }} />
                    </motion.button>
                </div>

                {post.mediaUrl && (
                    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, maxHeight: 280, background: 'var(--card)' }}>
                        {post.mediaType === 'video'
                            ? <video src={post.mediaUrl} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} controls muted />
                            : <img src={post.mediaUrl} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} alt="" />
                        }
                    </div>
                )}

                <textarea
                    className="input"
                    placeholder="Write a caption…"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={4}
                    style={{ resize: 'none', marginBottom: 14 }}
                />

                <div className="flex gap-3 mt-4">
                    <button className="btn btn-secondary flex-1" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <motion.button
                        className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`}
                        onClick={handleSave}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    )
}
