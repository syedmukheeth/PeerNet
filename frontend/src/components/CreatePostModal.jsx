import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

export default function CreatePostModal({ onClose }) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [loading, setLoading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef()

    const processFile = (f) => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }
    const handleFile = (e) => processFile(e.target.files[0])
    const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }, [])

    const handleSubmit = async () => {
        if (!file) return toast.error('Select a photo or video first')
        setLoading(true)
        try {
            const fd = new FormData()
            // Robust video detection: MIME type, extension, and large octet-stream files (raw mobile videos)
            const isVideoUpload =
                file.type?.startsWith('video/') ||
                /\.(mp4|mov|webm|mkv|avi|3gp|hevc|m4v)$/i.test(file.name || '') ||
                (file.type === 'application/octet-stream' && file.size > 1_000_000)

            fd.append(isVideoUpload ? 'video' : 'media', file)
            fd.append('caption', caption)

            const config = { headers: { 'Content-Type': 'multipart/form-data' } }

            if (isVideoUpload) {
                await api.post('/dscrolls', fd, config)
                toast.success('🎬 Video shared! Opening Dscrolls...')
                // Invalidate before closing so the next mount sees fresh data
                await queryClient.invalidateQueries({ queryKey: ['dscrolls'] })
                await queryClient.invalidateQueries({ queryKey: ['feed'] })
                onClose()
                // Navigate to Dscrolls so the user can immediately see the video
                navigate('/dscrolls')
            } else {
                await api.post('/posts', fd, config)
                toast.success('✅ Post shared!')
                await queryClient.invalidateQueries({ queryKey: ['feed'] })
                onClose()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share content')
        } finally {
            setLoading(false)
        }
    }

    const isVideo = file
        ? file.type?.startsWith('video/') ||
          /\.(mp4|mov|webm|mkv|avi|3gp|hevc|m4v)$/i.test(file.name || '') ||
          (file.type === 'application/octet-stream' && file.size > 1_000_000)
        : false

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal-card"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ 
                        fontSize: 20, 
                        fontWeight: 800, 
                        background: 'var(--logo-gradient)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent',
                        fontFamily: 'Syne, Inter, sans-serif'
                    }}>
                        {isVideo ? '🎬 New Dscroll' : '📸 New Post'}
                    </h2>
                    <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <HiX style={{ fontSize: 18 }} />
                    </motion.button>
                </div>

                {!preview ? (
                    <div
                        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                        onClick={() => inputRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 14, fontSize: 40 }}>
                            <HiPhotograph style={{ color: 'var(--accent)' }} />
                            <HiVideoCamera style={{ color: 'var(--text-3)' }} />
                        </div>
                        <p className="t-title" style={{ marginBottom: 6 }}>Drop photo or video here</p>
                        <p className="t-small">or click to browse</p>
                        <input ref={inputRef} type="file" accept="image/*,video/*,.mp4,.mov,.avi,.webm,.mkv,.3gp" hidden onChange={handleFile} />
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 14, maxHeight: 320, background: 'var(--card)' }}>
                        {isVideo
                            ? <video src={preview} style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} controls playsInline />
                            : <img src={preview} style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} alt="" />
                        }
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => { setFile(null); setPreview(null) }}
                            style={{ position: 'absolute', top: 10, right: 10 }}>
                            Change
                        </button>
                    </div>
                )}

                {isVideo && (
                    <div style={{
                        margin: '8px 0 12px',
                        padding: '10px 12px',
                        background: 'rgba(99,102,241,0.1)',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--accent)',
                        border: '1px solid rgba(99,102,241,0.2)',
                    }}>
                        📱 This will be posted as a Dscroll (short video)
                    </div>
                )}

                <textarea className="input" placeholder="Write a caption…"
                    value={caption} onChange={e => setCaption(e.target.value)}
                    rows={3} style={{ marginTop: 4, resize: 'none' }} />

                <motion.button className="btn btn-primary w-full"
                    style={{ 
                        marginTop: 20, 
                        height: 52, 
                        fontSize: 15, 
                        fontWeight: 700,
                        boxShadow: '0 8px 24px var(--accent-ring)'
                    }}
                    onClick={handleSubmit}
                    disabled={loading || !file}
                    whileHover={{ scale: 1.01, boxShadow: '0 12px 32px var(--accent-ring)' }} 
                    whileTap={{ scale: 0.98 }}>
                    {loading
                        ? <><span className="spinner" style={{ width: 18, height: 18 }} />&nbsp;Uploading...</>
                        : isVideo ? '🎬 Share Dscroll' : '✅ Share Post'
                    }
                </motion.button>
            </motion.div>
        </div>
    )
}
