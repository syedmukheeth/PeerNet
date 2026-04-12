import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiClipboardList, HiBugAnt, HiLightningBolt } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function FeedbackModal({ onClose }) {
    const [type, setType] = useState('bug') // bug, feature, other
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!text.trim()) return toast.error('Please describe your feedback')
        
        setLoading(true)
        try {
            await api.post('/feedback', { type, content: text })
            toast.success('Thank you for helping us improve PeerNet!')
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit feedback')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className="glass-card"
                style={{ width: '100%', maxWidth: 460, padding: 24, borderRadius: 20, position: 'relative' }}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="icon-wrap-accent" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', padding: 8, borderRadius: 10 }}>
                            <HiClipboardList size={22} />
                        </div>
                        <h3 className="t-heading">Send Feedback</h3>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="flex gap-2">
                        {[
                            { id: 'bug', label: 'Bug', icon: <HiBugAnt /> },
                            { id: 'feature', label: 'Feature', icon: <HiLightningBolt /> },
                            { id: 'other', label: 'Other', icon: <HiClipboardList /> },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                className={`btn btn-sm ${type === t.id ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, gap: 6 }}
                                onClick={() => setType(t.id)}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        className="input"
                        style={{ minHeight: 120, resize: 'none', padding: 16 }}
                        placeholder={type === 'bug' ? "What went wrong? Describe the bug..." : "Tell us what's on your mind..."}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        required
                        autoFocus
                    />

                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <button type="button" className="btn btn-ghost w-full" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary w-full" disabled={loading || !text.trim()}>
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}
