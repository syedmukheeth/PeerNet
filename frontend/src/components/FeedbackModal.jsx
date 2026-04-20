import { useState } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiClipboardList, HiFire, HiLightningBolt } from 'react-icons/hi'
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
        <div className="modal-overlay" onClick={onClose}>
            <motion.div 
                className="modal-card w-full max-w-[460px] p-6"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-subtle text-accent rounded-xl flex items-center justify-center">
                            <HiClipboardList size={22} />
                        </div>
                        <h3 className="t-h2 m-0">Send Feedback</h3>
                    </div>
                    <button className="btn btn-icon-sm" onClick={onClose}><HiX size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="flex gap-2">
                        {[
                            { id: 'bug', label: 'Bug', icon: <HiFire /> },
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

                    <div className="flex gap-3 mt-4">
                        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
                        <button 
                            type="submit" 
                            className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} 
                            disabled={loading || !text.trim()}
                        >
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
