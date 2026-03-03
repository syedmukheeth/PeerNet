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
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ zIndex: 900, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, maxWidth: 400, width: '90%', padding: '20px 24px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>

                        <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={onClose}><HiX /></button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {loading ? (
                                <div className="flex justify-center" style={{ padding: '40px 0' }}>
                                    <div className="spinner" />
                                </div>
                            ) : users.length === 0 ? (
                                <div className="empty-state" style={{ padding: '40px 0' }}>
                                    <div className="empty-state-icon"><HiUser /></div>
                                    <p className="empty-state-title">No users found</p>
                                </div>
                            ) : (
                                users.map(u => {
                                    const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=FF375F&color=fff`
                                    return (
                                        <Link key={u._id} to={`/profile/${u._id}`} onClick={onClose}
                                            className="flex items-center gap-3" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <img src={avatar} className="avatar avatar-md" alt="" />
                                            <div style={{ flex: 1 }}>
                                                <div className="flex items-center gap-1">
                                                    <strong style={{ fontSize: 15 }}>{u.username}</strong>
                                                    {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 16 }} />}
                                                </div>
                                                {u.fullName && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{u.fullName}</div>}
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
