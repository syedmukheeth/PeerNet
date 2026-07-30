import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiBadgeCheck, HiUser } from 'react-icons/hi'
import api, { chatApi } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ShareModal({ isOpen, onClose, postId }) {
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [sentStatus, setSentStatus] = useState({})
    const [sendingTo, setSendingTo] = useState(null)

    useEffect(() => {
        if (!isOpen || !currentUser) return
        setLoading(true)
        setUsers([])
        setSentStatus({})
        api.get(`/users/${currentUser._id}/following`)
            .then(({ data }) => setUsers(data.data || []))
            .catch(() => toast.error('Could not load the people you follow'))
            .finally(() => setLoading(false))
    }, [isOpen, currentUser])

    // Sends the post as a direct message: open (or reuse) the conversation,
    // then post a message containing the link.
    const handleSend = async (u) => {
        if (!postId) return
        setSendingTo(u._id)
        try {
            const { data } = await chatApi.post('', { targetUserId: u._id })
            const conversationId = data.data?._id
            if (!conversationId) throw new Error('No conversation returned')
            await chatApi.post(`/${conversationId}/messages`, {
                body: `${window.location.origin}/posts/${postId}`,
            })
            setSentStatus(prev => ({ ...prev, [u._id]: true }))
            toast.success(`Sent to ${u.username}`)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send')
        } finally {
            setSendingTo(null)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    style={{ zIndex: 10000 }}>
                    <motion.div
                        onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.93, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
                        exit={{ scale: 0.93, opacity: 0, y: 16 }}
                        className="modal-card"
                        style={{ padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden', maxWidth: 400, width: '100%' }}>

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 20px',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Share to...</h2>
                            <button onClick={onClose} style={{
                                background: 'var(--hover)', border: 'none', borderRadius: '50%',
                                width: 32, height: 32, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)',
                                fontSize: 17, transition: 'background 150ms',
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-md)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--hover)'}>
                                <HiX />
                            </button>
                        </div>

                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                                    <div className="spinner cursor-pointer" />
                                </div>
                            ) : users.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
                                    <div style={{ fontSize: 38, marginBottom: 12, display: 'flex', justifyContent: 'center' }}><HiUser /></div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>Nobody to share with yet</p>
                                    <p style={{ fontSize: '13px', marginTop: 4 }}>You can share posts with accounts you follow.</p>
                                </div>
                            ) : (
                                users.map(u => {
                                    const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                                    const isSent = sentStatus[u._id]
                                    return (
                                        <div key={u._id} style={{
                                            display: 'flex', alignItems: 'center', gap: 13,
                                            padding: '10px 20px', transition: 'background 120ms',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <img src={avatar} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} alt="" />
                                            
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 14 }}>
                                                    {u.username}
                                                    {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14 }} />}
                                                </div>
                                                {u.fullName && (
                                                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {u.fullName}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => !isSent && handleSend(u)}
                                                disabled={isSent || sendingTo === u._id}
                                                style={{
                                                    background: isSent ? 'transparent' : 'var(--accent)',
                                                    color: isSent ? 'var(--text-3)' : '#fff',
                                                    border: isSent ? '1px solid var(--border-md)' : 'none',
                                                    padding: '6px 16px',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    minWidth: 72,
                                                    cursor: isSent ? 'default' : 'pointer',
                                                }}
                                            >
                                                {isSent ? 'Sent' : sendingTo === u._id ? 'Sending…' : 'Send'}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
