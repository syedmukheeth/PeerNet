import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

export default function CreatePostModal({ onClose }) {
    const queryClient = useQueryClient()
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
            const isVideoUpload = file.type.startsWith('video/')
            fd.append(isVideoUpload ? 'video' : 'media', file)
            fd.append('caption', caption)

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (isVideoUpload) {
                await api.post('/dscrolls', fd, config)
                toast.success('Dscroll shared!')
                queryClient.invalidateQueries({ queryKey: ['dscrolls'] })
            } else {
                await api.post('/posts', fd, config)
                toast.success('Post shared!')
                queryClient.invalidateQueries({ queryKey: ['feed'] })
            }
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create post')
        } finally { setLoading(false) }
    }

    const isVideo = file?.type?.startsWith('video/')

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal-card"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 className="t-heading" style={{ fontSize: 17 }}>New Post</h2>
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
                        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 14, maxHeight: 320, background: 'var(--card)' }}>
                        {isVideo
                            ? <video src={preview} style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} controls />
                            : <img src={preview} style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} alt="" />
                        }
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => { setFile(null); setPreview(null) }}
                            style={{ position: 'absolute', top: 10, right: 10 }}>
                            Change
                        </button>
                    </div>
                )}

                <textarea className="input" placeholder="Write a caption…"
                    value={caption} onChange={e => setCaption(e.target.value)}
                    rows={3} style={{ marginTop: 12, resize: 'none' }} />

                <motion.button className="btn btn-primary w-full"
                    style={{ marginTop: 14, height: 46 }}
                    onClick={handleSubmit}
                    disabled={loading || !file}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Share Post'}
                </motion.button>
            </motion.div>
        </div>
    )
}
