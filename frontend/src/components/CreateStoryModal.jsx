import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiX, HiEmojiHappy, HiTypeBackground, HiTextAlignmentLeft, 
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
                    className="modal-card !p-0 !overflow-visible" 
                    style={{ width: '100%', maxWidth: '540px', background: 'var(--surface-1)' }}
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header: Clean & Standardized */}
                    <div className="l-cluster justify-between px-6 py-5 border-b border-white/5">
                        <span className="text-[20px] font-black tracking-tight text-white">Create Status</span>
                        <motion.button 
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={onClose}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <HiX size={18} />
                        </motion.button>
                    </div>

                    {/* Body: Premium Glass Editor */}
                    <div className="px-6 py-6">
                        <div 
                            className="l-glass-panel status-editor-container relative shadow-2xl"
                            style={{ 
                                background: backgroundColor,
                                minHeight: '400px',
                                border: '1px solid rgba(255,255,255,0.15)'
                            }}
                        >
                            {/* Inner Specular Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                            
                            <textarea 
                                ref={textareaRef}
                                className={`status-textarea ${FONT_FAMILIES[fontIdx].class} !selection:bg-white/30`}
                                placeholder="Share your world..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                autoFocus
                                style={{ 
                                    fontSize: calcFontSize(),
                                    textAlign: textAlign,
                                    color: textColor,
                                    textShadow: backgroundColor === '#0d0d0d' ? 'none' : '0 2px 10px rgba(0,0,0,0.1)',
                                    fontWeight: 800,
                                    position: 'relative',
                                    zIndex: 1
                                }}
                            />

                            {/* Floating AI Sparkle */}
                            {content.length > 5 && (
                                <motion.button
                                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all"
                                    onClick={optimizeWithAI}
                                    disabled={generatingAI}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    {generatingAI ? <span className="spinner-sm" /> : <HiSparkles size={18} />}
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* Controls System */}
                    <div className="px-6 pb-6 l-stack l-stack-lg">
                        {/* Design Toolbar */}
                        <div className="l-cluster justify-between p-1.5 bg-white/5 rounded-2xl border border-white/5">
                            <div className="l-cluster gap-1">
                                <button 
                                    className="px-4 h-9 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2" 
                                    onClick={cycleFont}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-40">Font</span>
                                    <span className="text-[13px] font-bold text-accent">{FONT_FAMILIES[fontIdx].name}</span>
                                </button>
                                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                <div className="l-cluster gap-0.5">
                                    <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${textAlign === 'left' ? 'bg-white/10 text-accent' : 'text-white/40 hover:text-white'}`} onClick={() => setTextAlign('left')}>
                                        <HiTextAlignmentLeft size={18} />
                                    </button>
                                    <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${textAlign === 'center' ? 'bg-white/10 text-accent' : 'text-white/40 hover:text-white'}`} onClick={() => setTextAlign('center')}>
                                        <HiTextAlignmentCenter size={18} />
                                    </button>
                                    <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${textAlign === 'right' ? 'bg-white/10 text-accent' : 'text-white/40 hover:text-white'}`} onClick={() => setTextAlign('right')}>
                                        <HiTextAlignmentRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative mr-1" ref={emojiRef}>
                                <button 
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showEmoji ? 'bg-accent text-white' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`} 
                                    onClick={() => setShowEmoji(!showEmoji)}
                                >
                                    <HiEmojiHappy size={20} />
                                </button>
                                {showEmoji && (
                                    <div className="absolute bottom-full right-0 mb-4 z-[100] shadow-3xl">
                                        <EmojiPicker 
                                            theme="dark" 
                                            onEmojiClick={handleEmoji}
                                            width={320}
                                            height={400}
                                            skinTonesDisabled
                                            searchDisabled
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Visual Selectors */}
                        <div className="l-cluster gap-6">
                            <div className="l-stack l-stack-sm flex-1">
                                <span className="text-[11px] font-black uppercase tracking-widest opacity-30 px-1">Background</span>
                                <div className="l-cluster gap-2.5 px-1 pb-1">
                                    {BG_PRESETS.map(preset => (
                                        <button 
                                            key={preset.name}
                                            className={`w-7 h-7 rounded-full border-2 transition-all relative ${backgroundColor === preset.value ? 'border-accent scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                            style={{ background: preset.value }}
                                            onClick={() => setBackgroundColor(preset.value)}
                                        >
                                            {backgroundColor === preset.value && (
                                                <div className="absolute inset-0 rounded-full blur-md bg-accent opacity-30 shadow-accent" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="l-stack l-stack-sm w-fit border-l border-white/5 pl-6">
                                <span className="text-[11px] font-black uppercase tracking-widest opacity-30">Text</span>
                                <div className="l-cluster gap-2 pb-1">
                                    {COLOR_PALETTE.map(color => (
                                        <button 
                                            key={color}
                                            className={`w-5 h-5 rounded-full border-2 transition-all ${textColor === color ? 'border-accent scale-125' : 'border-white/10'}`}
                                            style={{ background: color }}
                                            onClick={() => setTextColor(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer: Premium Action Strip */}
                        <div className="l-cluster gap-3 w-full pt-4">
                            <button 
                                className="flex-1 h-12 rounded-2xl bg-white/5 text-[14px] font-bold text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button 
                                className="flex-[1.5] h-12 rounded-2xl btn-gradient-share text-[15px] l-cluster justify-center gap-2.5 shadow-2xl shadow-indigo-500/20" 
                                onClick={handleSubmit}
                                disabled={loading || !content.trim()}
                            >
                                {loading ? <span className="spinner-sm" /> : (
                                    <>
                                        <span>Share Status</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-pulse" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
