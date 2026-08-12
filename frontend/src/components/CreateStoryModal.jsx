import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiEmojiHappy, HiCamera, HiTrash } from 'react-icons/hi'
import { FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi'
import EmojiPicker from 'emoji-picker-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const FONT_FAMILIES = [
    { name: 'Modern', class: 'font-modern' },
    { name: 'Classic', class: 'font-classic' },
    { name: 'Neon', class: 'font-neon' },
    { name: 'Strong', class: 'font-strong' }
]

const BG_PRESETS = [
    { name: 'Indigo Flare', value: 'linear-gradient(135deg, #6366F1, #A78BFA)' },
    { name: 'Sunset Bloom', value: 'linear-gradient(135deg, #F59E0B, #EC4899)' },
    { name: 'Emerald Night', value: 'linear-gradient(135deg, #059669, #000000)' },
    { name: 'Royal Velvet', value: 'linear-gradient(135deg, #4338ca, #1e1b4b)' },
    { name: 'Crimson Sky', value: 'linear-gradient(135deg, #ff4b1f, #1fddff)' },
    { name: 'Dark Obsidian', value: '#0d0d0d' },
]

const COLOR_PALETTE = ['#ffffff', '#000000', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a29bfe', '#fd79a8']

export default function CreateStatusModal({ onClose, onSuccess }) {
    const [content, setContent] = useState('')
    const [backgroundColor, setBackgroundColor] = useState(BG_PRESETS[0].value)
    const [fontIdx, setFontIdx] = useState(0)
    const [textColor, setTextColor] = useState('#ffffff')
    const [textAlign, setTextAlign] = useState('center')
    const [showEmoji, setShowEmoji] = useState(false)
    const [loading, setLoading] = useState(false)

    const [mediaFile, setMediaFile] = useState(null)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [mediaType, setMediaType] = useState('text') // 'text', 'image', 'video'

    const textareaRef = useRef(null)
    const emojiRef = useRef(null)
    const fileInputRef = useRef(null)

    // Auto-grow textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const scrollHeight = textareaRef.current.scrollHeight
            textareaRef.current.style.height = scrollHeight + 'px'
        }
    }, [content])

    // Close emoji picker on click outside
    useEffect(() => {
        const handler = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const calcFontSize = () => {
        const len = content.length
        if (len < 20) return '42px'
        if (len < 50) return '32px'
        if (len < 100) return '24px'
        return '20px'
    }

    const cycleFont = () => setFontIdx(prev => (prev + 1) % FONT_FAMILIES.length)
    
    const handleEmoji = (emojiData) => {
        setContent(prev => prev + emojiData.emoji)
        setShowEmoji(false)
    }

    const handleMediaSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // 10MB limit for demo, adjust as needed
        if (file.size > 10 * 1024 * 1024) {
            return toast.error('File too large (Max 10MB)')
        }

        const isVideo = file.type.startsWith('video/')
        const isImage = file.type.startsWith('image/')

        if (!isVideo && !isImage) {
            return toast.error('Please select an image or video')
        }

        setMediaFile(file)
        setMediaType(isVideo ? 'video' : 'image')
        setMediaPreview(URL.createObjectURL(file))
        
        // If it's media, clear the background preset if it's just a solid color
        // but maybe keep the content if they want an overlay
    }

    // Revokes the blob URL when the preview changes or the modal unmounts.
    // Without it every media pick pinned the whole file in memory for the rest
    // of the session.
    useEffect(() => {
        if (!mediaPreview) return
        return () => URL.revokeObjectURL(mediaPreview)
    }, [mediaPreview])

    const removeMedia = () => {
        setMediaFile(null)
        setMediaType('text')
        setMediaPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }


    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return toast.error('Story cannot be empty')
        setLoading(true)
        try {
            const formData = new FormData()
            
            if (mediaFile) {
                formData.append('media', mediaFile)
                formData.append('mediaType', mediaType)
                if (content.trim()) formData.append('content', content.trim())
            } else {
                formData.append('mediaType', 'text')
                formData.append('content', content.trim())
                formData.append('backgroundColor', backgroundColor)
            }

            formData.append('fontFamily', FONT_FAMILIES[fontIdx].name)
            formData.append('textAlign', textAlign)
            formData.append('textColor', textColor)
            formData.append('isBold', 'true')

            await api.post('/stories', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            toast.success('Story posted')
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share story')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            <motion.div 
                className="modal-overlay" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ zIndex: 1000 }}
            >
                <motion.div 
                    className="l-status-modal glass-card" 
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* --- Header: Simple & Unobtrusive --- */}
                    <header className="status-modal-header">
                        <span className="status-modal-title">Create Story</span>
                        <button className="status-modal-close" onClick={onClose} aria-label="Close">
                            <HiX size={20} />
                        </button>
                    </header>

                    {/* --- Immersive Preview Canvas --- */}
                    <div className="status-canvas-wrap">
                        <div 
                            className="status-preview-canvas"
                            style={{ background: mediaPreview ? '#000' : backgroundColor }}
                        >
                            {/* Media Layer */}
                            {mediaPreview && (
                                <div className="absolute inset-0 z-0">
                                    {mediaType === 'video' ? (
                                        <video 
                                            src={mediaPreview} 
                                            className="w-full h-full object-cover"
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline
                                        />
                                    ) : (
                                        <img 
                                            src={mediaPreview} 
                                            className="w-full h-full object-cover" 
                                            alt="Preview" 
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/30" /> {/* Scrim for text readability */}
                                    
                                    <button 
                                        className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors z-10"
                                        onClick={removeMedia}
                                    >
                                        <HiTrash size={20} />
                                    </button>
                                </div>
                            )}

                            {/* Inner Glows */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/10 pointer-events-none" />
                            
                            <textarea 
                                ref={textareaRef}
                                className={`status-main-textarea ${FONT_FAMILIES[fontIdx].class} z-10`}
                                placeholder={mediaFile ? 'Add a caption...' : 'Type a status...'}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                autoFocus
                                style={{ 
                                    fontSize: mediaFile ? '24px' : calcFontSize(),
                                    textAlign: textAlign,
                                    color: textColor,
                                    fontWeight: 700
                                }}
                            />


                        </div>
                    </div>

                    {/* --- Controls Strip --- */}
                    <div className="status-controls-panel">
                        <div className="status-toolbar">
                            <div className="status-toolbar-group">
                                <button className="status-tool-btn media-btn" onClick={() => fileInputRef.current.click()} aria-label="Add a photo or video">
                                    <HiCamera size={20} className="mr-2" />
                                    <span className="tool-label">Media</span>
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,video/*"
                                    onChange={handleMediaSelect}
                                />
                                <div className="tool-divider" />
                                <button className="status-tool-btn font-selector" onClick={cycleFont}>
                                    <span className="tool-label">Font</span>
                                    <span className="tool-value">{FONT_FAMILIES[fontIdx].name}</span>
                                </button>
                                <div className="tool-divider" />
                                <div className="align-controls">
                                    <button className={`tool-icon-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => setTextAlign('left')}>
                                        <FiAlignLeft size={20} />
                                    </button>
                                    <button className={`tool-icon-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => setTextAlign('center')}>
                                        <FiAlignCenter size={20} />
                                    </button>
                                    <button className={`tool-icon-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => setTextAlign('right')}>
                                        <FiAlignRight size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative" ref={emojiRef}>
                                <button 
                                    className={`tool-icon-btn emoji-btn ${showEmoji ? 'is-open' : ''}`} 
                                    onClick={() => setShowEmoji(!showEmoji)}
                                >
                                    <HiEmojiHappy size={22} />
                                </button>
                                {showEmoji && (
                                    <div className="status-emoji-picker">
                                        <EmojiPicker 
                                            theme="dark" 
                                            onEmojiClick={handleEmoji}
                                            width={320}
                                            height={380}
                                            skinTonesDisabled
                                            searchDisabled
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Background & Color selectors */}
                        <div className="status-style-selectors">
                            <div className="selector-group">
                                <span className="selector-label">Background</span>
                                <div className="preset-list">
                                    {BG_PRESETS.map(preset => (
                                        <button 
                                            key={preset.name}
                                            className={`preset-dot ${backgroundColor === preset.value ? 'is-active' : ''}`}
                                            style={{ background: preset.value }}
                                            onClick={() => setBackgroundColor(preset.value)}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="selector-group border-l border-white/10 pl-6">
                                <span className="selector-label">Text Color</span>
                                <div className="preset-list">
                                    {COLOR_PALETTE.map(color => (
                                        <button 
                                            key={color}
                                            className={`color-dot ${textColor === color ? 'is-active' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setTextColor(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="status-footer-actions">
                            <button className="btn btn-secondary px-6" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button 
                                className={`btn btn-primary px-8 ${loading ? 'btn-loading' : ''}`} 
                                onClick={handleSubmit}
                                disabled={loading || (!content.trim() && !mediaFile)}
                            >
                                {loading ? 'Sharing...' : 'Share Story'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
