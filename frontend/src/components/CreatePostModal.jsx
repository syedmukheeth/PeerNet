import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera, HiSparkles, HiPencilAlt } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

export default function CreatePostModal({ onClose }) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [isTextMode, setIsTextMode] = useState(false)
    const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #0f172a 0%, #334155 100%)')
    const [generatingAI, setGeneratingAI] = useState(false)
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [loading, setLoading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef()

    const bgPresets = [
        { name: 'Obsidian Night', value: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' },
        { name: 'Obsidian Flare', value: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)' },
        { name: 'Midnight Aurora', value: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' },
        { name: 'Eclipse Crimson', value: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' },
        { name: 'Royal Velvet', value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' },
    ]

    const generateAICaption = async () => {
        if (!file || isVideo) return // Vision works better for static images
        setGeneratingAI(true)
        try {
            const fd = new FormData()
            fd.append('media', file)
            const { data } = await api.post('/ai/generate-caption', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            if (data.success) {
                setCaption(data.data.caption)
                toast.success('AI: Caption suggested! ✨')
            }
        } catch {
            toast.error('AI: Failed to generate caption')
        } finally {
            setGeneratingAI(false)
        }
    }

    const processFile = (f) => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }
    const handleFile = (e) => processFile(e.target.files[0])
    const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }, [])

    const handleSubmit = async () => {
        if (!isTextMode && !file) return toast.error('Select a photo or video first')
        if (isTextMode && !caption.trim()) return toast.error('Type something for your post')
        
        setLoading(true)
        try {
            const fd = new FormData()
            
            if (isTextMode) {
                fd.append('mediaType', 'text')
                fd.append('backgroundColor', backgroundColor)
                fd.append('caption', caption)
                
                await api.post('/posts', fd)
                toast.success('📝 Status shared!')
                await queryClient.invalidateQueries({ queryKey: ['feed'] })
                onClose()
            } else {
                // Robust video detection
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
                    await queryClient.invalidateQueries({ queryKey: ['dscrolls'] })
                    await queryClient.invalidateQueries({ queryKey: ['feed'] })
                    onClose()
                    navigate('/dscrolls')
                } else {
                    await api.post('/posts', fd, config)
                    toast.success('✅ Post shared!')
                    await queryClient.invalidateQueries({ queryKey: ['feed'] })
                    onClose()
                }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button 
                            className={`btn-tab ${!isTextMode ? 'active' : ''}`}
                            onClick={() => setIsTextMode(false)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6, 
                                fontSize: 13, 
                                fontWeight: 700,
                                opacity: !isTextMode ? 1 : 0.5
                            }}
                        >
                            <HiPhotograph /> MEDIA
                        </button>
                        <button 
                            className={`btn-tab ${isTextMode ? 'active' : ''}`}
                            onClick={() => setIsTextMode(true)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6, 
                                fontSize: 13, 
                                fontWeight: 700,
                                opacity: isTextMode ? 1 : 0.5
                            }}
                        >
                            <HiPencilAlt /> TEXT
                        </button>
                    </div>
                    <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <HiX style={{ fontSize: 18 }} />
                    </motion.button>
                </div>

                {isTextMode ? (
                    <div style={{ 
                        height: 280, 
                        background: backgroundColor, 
                        borderRadius: 16, 
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        transition: 'background 0.3s ease',
                        position: 'relative',
                        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.2)'
                    }}>
                        <textarea 
                            className="text-post-input"
                            placeholder="What's on your mind?"
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: 24,
                                fontWeight: 800,
                                textAlign: 'center',
                                width: '100%',
                                maxHeight: '100%',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'Syne, Inter, sans-serif'
                            }}
                        />
                        <div style={{ 
                            position: 'absolute', 
                            bottom: 16, 
                            left: 16, 
                            right: 16, 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: 8 
                        }}>
                            {bgPresets.map(preset => (
                                <motion.button
                                    key={preset.name}
                                    onClick={() => setBackgroundColor(preset.value)}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: preset.value,
                                        border: backgroundColor === preset.value ? '2px solid white' : '2px solid transparent',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : !preview ? (
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

                {!isTextMode && (
                    <div style={{ position: 'relative' }}>
                        <textarea className="input" placeholder="Write a caption…"
                            value={caption} onChange={e => setCaption(e.target.value)}
                            rows={3} style={{ marginTop: 4, resize: 'none', paddingRight: 40 }} />
                        
                        {preview && !isVideo && (
                            <motion.button
                                className="btn-ai-sparkle"
                                onClick={generateAICaption}
                                disabled={generatingAI}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    bottom: 12,
                                    background: 'var(--logo-gradient)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: 'white',
                                    padding: '6px',
                                    display: 'flex',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px var(--accent-ring)'
                                }}
                                title="Suggest AI Caption"
                            >
                                {generatingAI ? <span className="spinner-sm" /> : <HiSparkles />}
                            </motion.button>
                        )}
                    </div>
                )}

                <motion.button className="btn btn-primary w-full"
                    style={{ 
                        marginTop: 20, 
                        height: 52, 
                        fontSize: 15, 
                        fontWeight: 700,
                        boxShadow: '0 8px 24px var(--accent-ring)'
                    }}
                    onClick={handleSubmit}
                    disabled={loading || (!isTextMode && !file) || (isTextMode && !caption.trim())}
                    whileHover={{ scale: 1.01, boxShadow: '0 12px 32px var(--accent-ring)' }} 
                    whileTap={{ scale: 0.98 }}>
                    {loading
                        ? <><span className="spinner" style={{ width: 18, height: 18 }} />&nbsp;Sharing...</>
                        : isTextMode ? '✨ Share Status' : (isVideo ? '🎬 Share Dscroll' : '✅ Share Post')
                    }
                </motion.button>
            </motion.div>
        </div>
    )
}
