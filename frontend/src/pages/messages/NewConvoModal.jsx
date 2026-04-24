import { useState, useEffect } from 'react'
import { HiX, HiSearch, HiBadgeCheck } from 'react-icons/hi'
import api from '../../api/axios'

export default function NewConvoModal({ onClose, onStart }) {
    const [q, setQ] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!q.trim()) { setUsers([]); return }
        const t = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await api.get(`/users/search?q=${q}`)
                setUsers(res.data.users || [])
            } catch (err) {
                console.error('[NEW CONVO] Search failed:', err)
            } finally { setLoading(false) }
        }, 300)
        return () => clearTimeout(t)
    }, [q])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card dm-modal-card" onClick={e => e.stopPropagation()}>
                <div className="dm-modal-header">
                    <h3 className="dm-modal-title">New Message</h3>
                    <button className="dm-modal-close" onClick={onClose}><HiX size={20} /></button>
                </div>
                
                <div className="dm-modal-search-row">
                    <span className="dm-modal-label">To:</span>
                    <div className="dm-modal-search-box">
                        <HiSearch className="dm-modal-search-icon" />
                        <input
                            autoFocus
                            placeholder="Search names or usernames"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            className="dm-modal-search-input"
                        />
                    </div>
                </div>

                <div className="dm-modal-user-list no-scrollbar">
                    {loading && (
                        <div className="dm-modal-loader">
                            <div className="spinner-sm" />
                        </div>
                    )}
                    {!loading && users.map(u => (
                        <div key={u._id} onClick={() => onStart(u)}
                            className="dm-modal-user-row">
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`} className="dm-modal-avatar" alt="" />
                            <div className="dm-modal-user-info">
                                <div className="dm-modal-username">
                                    {u.username}
                                    {u.isVerified && <HiBadgeCheck className="dm-verified-icon" />}
                                </div>
                                <div className="dm-modal-fullname">{u.fullName}</div>
                            </div>
                        </div>
                    ))}
                    {!loading && q.trim() && users.length === 0 && (
                        <div className="dm-modal-empty">No users found.</div>
                    )}
                    {!q.trim() && (
                        <div className="dm-modal-empty">
                            <p className="dm-modal-empty-title">Suggested</p>
                            <p className="dm-modal-empty-text">Find people to start a conversation with.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
