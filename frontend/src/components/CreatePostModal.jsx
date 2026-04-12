import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera, HiSparkles, HiPencilAlt, HiCheckCircle } from 'react-icons/hi'
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

    const isVideo = file
        ? file.type?.startsWith('video/') ||
          /\.(mp4|mov|webm|mkv|avi|3gp|hevc|m4v)$/i.test(file.name || '') ||
          (file.type === 'application/octet-stream' && file.size > 1_000_000)
        : false

    const generateAICaption = async () => {
        if (!file || isVideo) return 
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

    const optimizeAICaption = async () => {
        if (!caption.trim()) return
        setGeneratingAI(true)
        try {
            const { data } = await api.post('/ai/optimize-caption', { text: caption })
            if (data.success) {
                setCaption(data.data.optimized)
                toast.success('AI: Caption optimized! ✨')
            }
        } catch {
            toast.error('AI: Failed to optimize caption')
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

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div className="modal-card"
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div className="creative-tabs">
                            <div 
                                className={`creative-tab ${!isTextMode ? 'active' : ''}`}
                                onClick={() => setIsTextMode(false)}>
                                <HiPhotograph /> MEDIA
                            </div>
                            <div 
                                className={`creative-tab ${isTextMode ? 'active' : ''}`}
                                onClick={() => setIsTextMode(true)}>
                                <HiPencilAlt /> TEXT
                            </div>
                        </div>
                        <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <HiX style={{ fontSize: 18 }} />
                        </motion.button>
                    </div>

                    {isTextMode ? (
                        <div className="story-text-preview" style={{ background: backgroundColor, minHeight: 220, borderRadius: 16 }}>
                            <textarea 
                                placeholder="What's on your mind?"
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                style={{ fontSize: 22, padding: '24px 20px' }}
                            />
                            
                            {caption.length > 5 && (
                                <motion.button
                                    className="btn-ai-sparkle"
                                    onClick={optimizeAICaption}
                                    disabled={generatingAI}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{ bottom: 16, right: 16 }}
                                    title="AI Optimize Status"
                                >
                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles />}
                                </motion.button>
                            )}

                            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8 }}>
                                {bgPresets.map(preset => (
                                    <motion.button
                                        key={preset.name}
                                        onClick={() => setBackgroundColor(preset.value)}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            width: 24, height: 24, borderRadius: '50%',
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
                            <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
                        </div>
                    ) : (
                        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 12, maxHeight: 280, background: 'var(--surface)' }}>
                            {isVideo
                                ? <video src={preview} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} controls playsInline />
                                : <img src={preview} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} alt="" />
                            }
                            <button className="btn btn-secondary btn-sm"
                                onClick={() => { setFile(null); setPreview(null) }}
                                style={{ position: 'absolute', top: 12, right: 12, borderRadius: 8 }}>
                                Change
                            </button>
                        </div>
                    )}

                    {isVideo && (
                        <div style={{
                            margin: '8px 0 12px',
                            padding: '10px 12px',
                            background: 'var(--accent-subtle)',
                            borderRadius: 12,
                            fontSize: 12.5,
                            color: 'var(--accent)',
                            border: '1px solid var(--accent-ring)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                        }}>
                            <HiVideoCamera /> 📱 Posted as a Dscroll (short video)
                        </div>
                    )}

                    {!isTextMode && (
                        <div style={{ position: 'relative' }}>
                            <textarea className="input" placeholder="Write a caption…"
                                value={caption} onChange={e => setCaption(e.target.value)}
                                rows={2} style={{ marginTop: 4, resize: 'none', paddingRight: 40, borderRadius: 12 }} />
                            
                            {(preview && !isVideo) || caption.trim().length > 3 ? (
                                <motion.button
                                    className="btn-ai-sparkle"
                                    onClick={caption.trim().length > 0 ? optimizeAICaption : generateAICaption}
                                    disabled={generatingAI}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={caption.trim().length > 0 ? "Optimize with AI" : "Suggest AI Caption"}
                                >
                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles />}
                                </motion.button>
                            ) : null}
                        </div>
                    )}

                    <motion.button className="btn btn-primary w-full"
                        style={{ 
                            marginTop: 16, 
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
                            : isTextMode ? <><HiCheckCircle /> Share Status</> : (isVideo ? <><HiVideoCamera /> Share Dscroll</> : <><HiCheckCircle /> Share Post</>)
                        }
                    </motion.button>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
