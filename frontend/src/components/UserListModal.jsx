import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HiX, HiBadgeCheck, HiUser } from 'react-icons/hi'
import api from '../api/axios'

export default function UserListModal({ isOpen, onClose, title, userId, type }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        setUsers([])
        api.get(`/users/${userId}/${type}`)
            .then(({ data }) => setUsers(data.data || []))
            .finally(() => setLoading(false))
    }, [isOpen, userId, type])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 900,
                        background: 'var(--overlay)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}>
                    <motion.div
                        onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.93, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
                        exit={{ scale: 0.93, opacity: 0, y: 16 }}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-md)',
                            borderRadius: 18,
                            width: '100%', maxWidth: 400,
                            maxHeight: '80vh',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                        }}>

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 20px',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
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
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                                    <div className="spinner" />
                                </div>
                            ) : users.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
                                    <div style={{ fontSize: 38, marginBottom: 12 }}><HiUser /></div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>No users yet</p>
                                </div>
                            ) : (
                                users.map(u => {
                                    const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                                    return (
                                        <Link key={u._id} to={`/profile/${u._id}`} onClick={onClose}
                                            style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 13,
                                                padding: '12px 20px', transition: 'background 120ms',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                                                onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                <img src={avatar} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} alt="" />
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
                                            </div>
                                        </Link>
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
