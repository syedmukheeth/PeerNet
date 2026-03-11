import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera, HiUpload } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function CreateStoryModal({ onClose, onSuccess }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef()

    const processFile = (f) => {
        if (!f) return
        setFile(f)
        setPreview(URL.createObjectURL(f))
    }

    const handleFile = (e) => processFile(e.target.files[0])
    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        processFile(e.dataTransfer.files[0])
    }, [])

    const handleSubmit = async () => {
        if (!file) return toast.error('Select a photo or video')
        setLoading(true)
        try {
            const fd = new FormData()
            fd.append('media', file)
            await api.post('/stories', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            toast.success('Story posted! ✨')
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post story')
        } finally { setLoading(false) }
    }

    const isVideo = file?.type?.startsWith('video/') ||
        /\.(mp4|mov|webm|mkv|avi|3gp|hevc)$/i.test(file?.name || '') ||
        (file?.type === 'application/octet-stream' && file?.size > 2000000)

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}>
                <motion.div
                    className="modal-card"
                    style={{ maxWidth: 440 }}
                    initial={{ opacity: 0, y: 28, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 28, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.34, 1.1, 0.64, 1] }}
                    onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <h2 style={{ fontFamily: "'Syne','Inter',sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--text-1)' }}>
                                Add to Story
                            </h2>
                            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                Disappears after 24 hours
                            </p>
                        </div>
                        <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <HiX style={{ fontSize: 18 }} />
                        </motion.button>
                    </div>

                    {/* Upload zone or preview */}
                    {!preview ? (
                        <motion.div
                            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                            onClick={() => inputRef.current.click()}
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            whileHover={{ borderColor: 'var(--accent)' }}
                            style={{ padding: '56px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16, fontSize: 44 }}>
                                <HiPhotograph style={{ color: 'var(--accent)', opacity: 0.9 }} />
                                <HiVideoCamera style={{ color: 'var(--text-3)' }} />
                            </div>
                            <p style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: 5, fontSize: 15 }}>
                                Drop your photo or video
                            </p>
                            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>or tap to browse</p>
                            <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
                        </motion.div>
                    ) : (
                        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', maxHeight: 340, background: 'var(--card)' }}>
                            {isVideo
                                ? <video src={preview} style={{ width: '100%', maxHeight: 340, objectFit: 'cover' }} controls muted />
                                : <img src={preview} alt="" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                            }
                            {/* Gradient overlay at top */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }} />
                            <button className="btn btn-sm"
                                onClick={() => { setFile(null); setPreview(null) }}
                                style={{
                                    position: 'absolute', top: 10, right: 10,
                                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                }}>
                                Change
                            </button>
                        </div>
                    )}

                    <motion.button
                        className="btn btn-primary w-full"
                        style={{ marginTop: 16, height: 46 }}
                        onClick={handleSubmit}
                        disabled={loading || !file}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}>
                        {loading
                            ? <span className="spinner" style={{ width: 18, height: 18 }} />
                            : <><HiUpload style={{ fontSize: 17 }} /> Post Story</>
                        }
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
