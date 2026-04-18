import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiX, 
    HiPhotograph, 
    HiVideoCamera, 
    HiSparkles, 
    HiPencilAlt, 
    HiCheckCircle,
    HiCloudUpload,
    HiHashtag,
    HiTrash
} from 'react-icons/hi'
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
    const textareaRef = useRef()
    const MAX_CHARS = 2200

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

    // Auto-expand textarea logic
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [caption])

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

    const processFile = (f) => { 
        if (!f) return
        setFile(f)
        setPreview(URL.createObjectURL(f)) 
    }

    const handleFile = (e) => processFile(e.target.files[0])
    
    const onDragOver = (e) => {
        e.preventDefault()
        setDragOver(true)
    }

    const onDragLeave = () => {
        setDragOver(false)
    }

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) processFile(f)
    }, [])

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
                const isVideoUpload = isVideo
                fd.append(isVideoUpload ? 'video' : 'media', file)
                fd.append('caption', caption)

                const config = { headers: { 'Content-Type': 'multipart/form-data' } }

                if (isVideoUpload) {
                    await api.post('/dscrolls', fd, config)
                    toast.success('🎬 Video shared!')
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

    const addHashtag = (tag) => {
        if (caption.includes(tag)) return
        setCaption(prev => prev.trim() + ' ' + tag)
    }

    return (
        <AnimatePresence>
            <div className="create-post-overlay" onClick={onClose}>
                <motion.div 
                    className="create-post-card"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <header className="create-post-header">
                        <div className="creative-tabs m-0 p-1">
                            <div 
                                className={`creative-tab ${!isTextMode ? 'active' : ''} t-h3 px-4 py-2`}
                                onClick={() => setIsTextMode(false)}
                            >
                                <HiPhotograph /> Media
                            </div>
                            <div 
                                className={`creative-tab ${isTextMode ? 'active' : ''} t-h3 px-4 py-2`}
                                onClick={() => setIsTextMode(true)}
                            >
                                <HiPencilAlt /> Status
                            </div>
                        </div>
                        <h2 className="t-h2 dm-mobile-hidden m-0">
                            {isTextMode ? 'Create Status' : 'Create New Post'}
                        </h2>
                        <button className="btn btn-ghost btn-icon-sm" onClick={onClose}>
                            <HiX size={20} />
                        </button>
                    </header>

                    {/* Body */}
                    <div className="create-post-body dark-scrollbar">
                        {isTextMode ? (
                            <div className="story-text-preview" style={{ background: backgroundColor, minHeight: 400, borderRadius: 0 }}>
                                <textarea 
                                    placeholder="What's on your mind?"
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    style={{ fontSize: 24, padding: '40px 30px', fontWeight: 700 }}
                                />
                                
                                <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 10 }}>
                                    {bgPresets.map(preset => (
                                        <motion.button
                                            key={preset.name}
                                            onClick={() => setBackgroundColor(preset.value)}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: preset.value,
                                                border: backgroundColor === preset.value ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                                boxShadow: backgroundColor === preset.value ? '0 0 12px rgba(255,255,255,0.3)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Upload / Preview */}
                                {!preview ? (
                                    <div
                                        className={`premium-upload-zone ${dragOver ? 'drag-over' : ''}`}
                                        onClick={() => inputRef.current.click()}
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                    >
                                        <div className="premium-upload-icon-ring">
                                            <HiCloudUpload />
                                        </div>
                                        <div>
                                            <p className="create-post-title" style={{ fontSize: 20, marginBottom: 4 }}>
                                                Drop photos or videos
                                            </p>
                                            <p className="t-small">High quality images and 4K videos supported</p>
                                        </div>
                                        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                                            Select from device
                                        </button>
                                        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
                                    </div>
                                ) : (
                                    <div className="premium-media-preview-wrap">
                                        {isVideo ? (
                                            <video src={preview} controls playsInline autoPlay muted loop />
                                        ) : (
                                            <img src={preview} alt="Preview" />
                                        )}
                                        <button 
                                            className="premium-remove-media"
                                            onClick={() => { setFile(null); setPreview(null) }}
                                            title="Remove Media"
                                        >
                                            <HiTrash size={18} />
                                        </button>
                                    </div>
                                )}

                                {/* Caption & Tools */}
                                <div className="premium-caption-section">
                                    <textarea
                                        ref={textareaRef}
                                        className="premium-caption-field"
                                        placeholder="Write a caption..."
                                        value={caption}
                                        onChange={e => setCaption(e.target.value.slice(0, MAX_CHARS))}
                                    />

                                    <div className="premium-caption-tools">
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div className="hashtags-helper" onClick={() => addHashtag('#peernet')}>#peernet</div>
                                            <div className="hashtags-helper" onClick={() => addHashtag('#community')}>#community</div>
                                            <div className="hashtags-helper" onClick={() => addHashtag('#web3')}>#web3</div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {((preview && !isVideo) || caption.trim().length > 3) && (
                                                <motion.button
                                                    className="btn-ai-sparkle"
                                                    onClick={caption.trim().length > 0 ? optimizeAICaption : generateAICaption}
                                                    disabled={generatingAI}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    style={{ position: 'relative' }}
                                                >
                                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles />}
                                                </motion.button>
                                            )}
                                            <span className={`character-counter ${caption.length > MAX_CHARS * 0.9 ? 'warning' : ''}`}>
                                                {caption.length}/{MAX_CHARS}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="create-post-footer">
                        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <motion.button 
                            className="btn btn-primary px-8"
                            onClick={handleSubmit}
                            disabled={loading || (!isTextMode && !file) || (isTextMode && !caption.trim())}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <><span className="spinner-sm" /> Sharing...</>
                            ) : (
                                <><HiCheckCircle /> {isTextMode ? 'Share Status' : 'Share Post'}</>
                            )}
                        </motion.button>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
