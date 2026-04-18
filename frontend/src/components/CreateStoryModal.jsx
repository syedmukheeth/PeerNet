import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiPhotograph, HiVideoCamera, HiUpload, HiPencilAlt, HiSparkles, HiMenu, HiMenuAlt2, HiMenuAlt3, HiLightningBolt, HiColorSwatch } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

const FONT_FAMILIES = [
    { name: 'Modern', class: 'font-modern' },
    { name: 'Classic', class: 'font-classic' },
    { name: 'Neon', class: 'font-neon' },
    { name: 'Strong', class: 'font-strong' }
]

const COLOR_PALETTE = [
    '#ffffff', '#000000', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a29bfe', '#fd79a8'
]

export default function CreateStoryModal({ onClose, onSuccess }) {
    const [isTextMode, setIsTextMode] = useState(false)
    const [content, setContent] = useState('')
    const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #6366F1, #A78BFA)')
    
    // Premium style metadata
    const [fontIdx, setFontIdx] = useState(0)
    const [textColor, setTextColor] = useState('#ffffff')
    const [textAlign, setTextAlign] = useState('center')
    const [isBold, setIsBold] = useState(true)

    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [generatingAI, setGeneratingAI] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef()

    const isVideo = file?.type?.startsWith('video/') ||
        /\.(mp4|mov|webm|mkv|avi|3gp|hevc)$/i.test(file?.name || '') ||
        (file?.type === 'application/octet-stream' && file?.size > 2000000)

    const calcFontSize = () => {
        const length = content.length
        if (length < 20) return 42
        if (length < 50) return 32
        if (length < 100) return 24
        return 18
    }

    const cycleFont = () => setFontIdx(prev => (prev + 1) % FONT_FAMILIES.length)
    const cycleAlign = () => {
        const flow = { center: 'left', left: 'right', right: 'center' }
        setTextAlign(flow[textAlign])
    }

    const optimizeAICaption = async () => {
        if (!content.trim()) return
        setGeneratingAI(true)
        try {
            const { data } = await api.post('/ai/optimize-caption', { text: content })
            if (data.success) {
                setContent(data.data.optimized)
                toast.success('AI: Story optimized! ✨')
            }
        } catch {
            toast.error('AI: Failed to optimize text')
        } finally {
            setGeneratingAI(false)
        }
    }

    const bgPresets = [
        { name: 'Indigo Flare', value: 'linear-gradient(135deg, #6366F1, #A78BFA)' },
        { name: 'Sunset Bloom', value: 'linear-gradient(135deg, #F59E0B, #EC4899)' },
        { name: 'Emerald Night', value: 'linear-gradient(135deg, #059669, #000000)' },
        { name: 'Royal Velvet', value: 'linear-gradient(135deg, #4338ca, #1e1b4b)' },
        { name: 'Crimson Sky', value: 'linear-gradient(135deg, #ff4b1f, #1fddff)' },
        { name: 'Dark Obsidian', value: '#0d0d0d' },
    ]

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
        if (isTextMode && !content.trim()) return toast.error('Type something for your story')
        if (!isTextMode && !file) return toast.error('Select a photo or video')
        
        setLoading(true)
        try {
            if (isTextMode) {
                await api.post('/stories', {
                    mediaType: 'text',
                    content: content.trim(),
                    backgroundColor,
                    fontFamily: FONT_FAMILIES[fontIdx].name,
                    textAlign,
                    isBold,
                    textColor
                })
            } else {
                const fd = new FormData()
                fd.append('media', file)
                await api.post('/stories', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            }
            
            toast.success('Story posted! ✨')
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post story')
        } finally { setLoading(false) }
    }

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
                    initial={{ opacity: 0, y: 28, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 28, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.34, 1.1, 0.64, 1] }}
                    onClick={e => e.stopPropagation()}>
                    
                    {/* Header with Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div>
                            <div className="creative-tabs">
                                <div 
                                    className={`creative-tab ${!isTextMode ? 'active' : ''} t-h3 px-4 py-2`}
                                    onClick={() => setIsTextMode(false)}>
                                    <HiPhotograph /> MEDIA
                                </div>
                                <div 
                                    className={`creative-tab ${isTextMode ? 'active' : ''} t-h3 px-4 py-2`}
                                    onClick={() => setIsTextMode(true)}>
                                    <HiPencilAlt /> TEXT
                                </div>
                            </div>
                            <p className="t-caption mt-1 mb-0">
                                Disappears after 24 hours
                            </p>
                        </div>
                        <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <HiX style={{ fontSize: 18 }} />
                        </motion.button>
                    </div>

                    {/* Content Area */}
                    {isTextMode ? (
                        <div className="story-creator-canvas" style={{ background: backgroundColor }}>
                            <div className="story-stage-overlay">
                                {/* Top Controls */}
                                <div className="story-toolbar-top">
                                    <button className={`story-toolbar-btn active`} onClick={cycleFont}>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                                            {FONT_FAMILIES[fontIdx].name}
                                        </span>
                                    </button>
                                    <button className="story-toolbar-btn" onClick={cycleAlign}>
                                        {textAlign === 'center' ? <HiMenu /> : textAlign === 'left' ? <HiMenuAlt2 /> : <HiMenuAlt3 />}
                                    </button>
                                    <button className={`story-toolbar-btn ${isBold ? 'active' : ''}`} onClick={() => setIsBold(!isBold)}>
                                        <span style={{ fontSize: 16, fontWeight: 800 }}>B</span>
                                    </button>
                                </div>

                                {/* Main Input Area */}
                                <div className="story-live-input-area">
                                    <textarea 
                                        className={`story-live-textarea ${FONT_FAMILIES[fontIdx].class}`}
                                        placeholder="Start typing..."
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        autoFocus
                                        style={{ 
                                            fontSize: calcFontSize(),
                                            textAlign: textAlign,
                                            fontWeight: isBold ? 900 : 400,
                                            color: textColor
                                        }}
                                    />
                                </div>

                                {/* Bottom Controls */}
                                <div className="story-toolbar-bottom">
                                    {/* Color Swatches */}
                                    <div className="story-swatch-list">
                                        {COLOR_PALETTE.map(c => (
                                            <div 
                                                key={c}
                                                className={`story-swatch ${textColor === c ? 'active' : ''}`}
                                                style={{ background: c }}
                                                onClick={() => setTextColor(c)}
                                            />
                                        ))}
                                    </div>

                                    {/* Background Presets */}
                                    <div className="story-swatch-list">
                                        {bgPresets.map(preset => (
                                            <div
                                                key={preset.name}
                                                className={`story-swatch ${backgroundColor === preset.value ? 'active' : ''}`}
                                                style={{ background: preset.value }}
                                                onClick={() => setBackgroundColor(preset.value)}
                                                title={preset.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {content.length > 3 && (
                                <motion.button
                                    className="btn-ai-sparkle"
                                    onClick={optimizeAICaption}
                                    disabled={generatingAI}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{ position: 'absolute', top: 80, right: 20, zIndex: 100 }}
                                    title="Optimize with AI"
                                >
                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles />}
                                </motion.button>
                            )}
                        </div>
                    ) : !preview ? (
                        <motion.div
                            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                            onClick={() => inputRef.current.click()}
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16, fontSize: 44 }}>
                                <HiPhotograph style={{ color: 'var(--accent)', opacity: 0.9 }} />
                                <HiVideoCamera style={{ color: 'var(--text-3)' }} />
                            </div>
                            <p className="t-title" style={{ marginBottom: 4 }}>
                                Drop your photo or video
                            </p>
                            <p className="t-small">or tap to browse</p>
                            <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
                        </motion.div>
                    ) : (
                        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', maxHeight: 400, background: 'var(--surface)' }}>
                            {isVideo
                                ? <video src={preview} style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} controls muted />
                                : <img src={preview} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
                            }
                            <button className="btn btn-sm"
                                onClick={() => { setFile(null); setPreview(null) }}
                                style={{
                                    position: 'absolute', top: 12, right: 12,
                                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 8
                                }}>
                                Change
                            </button>
                        </div>
                    )}

                    <motion.button
                        className="btn btn-primary w-full mt-4"
                        style={{ height: 48 }}
                        onClick={handleSubmit}
                        disabled={loading || (isTextMode ? !content.trim() : !file)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}>
                        {loading
                            ? <span className="spinner-sm" />
                            : <><HiUpload /> Post Story</>
                        }
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
