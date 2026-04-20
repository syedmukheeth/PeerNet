import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiX, HiEmojiHappy, HiTextAlignmentLeft, 
    HiTextAlignmentCenter, HiTextAlignmentRight, HiSparkles 
} from 'react-icons/hi'
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
    const [generatingAI, setGeneratingAI] = useState(false)

    const textareaRef = useRef(null)
    const emojiRef = useRef(null)

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

    const optimizeWithAI = async () => {
        if (!content.trim()) return
        setGeneratingAI(true)
        try {
            const { data } = await api.post('/ai/optimize-caption', { text: content })
            if (data.success) {
                setContent(data.data.optimized)
                toast.success('Optimized with AI ✨')
            }
        } catch {
            toast.error('AI optimization failed')
        } finally {
            setGeneratingAI(false)
        }
    }

    const handleSubmit = async () => {
        if (!content.trim()) return toast.error('Status cannot be empty')
        setLoading(true)
        try {
            await api.post('/stories', {
                mediaType: 'text',
                content: content.trim(),
                backgroundColor,
                fontFamily: FONT_FAMILIES[fontIdx].name,
                textAlign,
                textColor,
                isBold: true
            })
            toast.success('Status shared! ✨')
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share status')
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
                        <span className="status-modal-title">Create Status</span>
                        <button className="status-modal-close" onClick={onClose}>
                            <HiX size={20} />
                        </button>
                    </header>

                    {/* --- Immersive Preview Canvas --- */}
                    <div className="status-canvas-wrap">
                        <div 
                            className="status-preview-canvas"
                            style={{ background: backgroundColor }}
                        >
                            {/* Inner Glows */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/10 pointer-events-none" />
                            
                            <textarea 
                                ref={textareaRef}
                                className={`status-main-textarea ${FONT_FAMILIES[fontIdx].class}`}
                                placeholder="Type a status..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                autoFocus
                                style={{ 
                                    fontSize: calcFontSize(),
                                    textAlign: textAlign,
                                    color: textColor,
                                    fontWeight: 700
                                }}
                            />

                            {/* Floating AI Assistant */}
                            {content.length > 5 && (
                                <motion.button
                                    className="status-ai-btn"
                                    onClick={optimizeWithAI}
                                    disabled={generatingAI}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles size={18} />}
                                    <span>AI Polish</span>
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* --- Controls Strip --- */}
                    <div className="status-controls-panel">
                        <div className="status-toolbar">
                            <div className="status-toolbar-group">
                                <button className="status-tool-btn font-selector" onClick={cycleFont}>
                                    <span className="tool-label">Font</span>
                                    <span className="tool-value">{FONT_FAMILIES[fontIdx].name}</span>
                                </button>
                                <div className="tool-divider" />
                                <div className="align-controls">
                                    <button className={`tool-icon-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => setTextAlign('left')}>
                                        <HiTextAlignmentLeft size={20} />
                                    </button>
                                    <button className={`tool-icon-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => setTextAlign('center')}>
                                        <HiTextAlignmentCenter size={20} />
                                    </button>
                                    <button className={`tool-icon-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => setTextAlign('right')}>
                                        <HiTextAlignmentRight size={20} />
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
                                disabled={loading || !content.trim()}
                            >
                                {loading ? 'Sharing...' : 'Share Status'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
