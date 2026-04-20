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
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: 450, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>New Message</h3>
                    <button onClick={onClose}><HiX size={22} /></button>
                </div>
                
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>To:</span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiSearch style={{ color: 'var(--text-3)' }} />
                        <input
                            autoFocus
                            placeholder="Search names or usernames"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', width: '100%', fontSize: 14 }}
                        />
                    </div>
                </div>

                <div style={{ height: 400, overflowY: 'auto' }}>
                    {loading && (
                        <div style={{ padding: 20, textAlign: 'center' }}>
                            <div className="spinner-sm" style={{ margin: '0 auto' }} />
                        </div>
                    )}
                    {!loading && users.map(u => (
                        <div key={u._id} onClick={() => onStart(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer' }}
                            className="user-row-hover">
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`} style={{ width: 44, height: 44, borderRadius: '50%' }} alt="" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {u.username}
                                    {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{u.fullName}</div>
                            </div>
                        </div>
                    ))}
                    {!loading && q.trim() && users.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No users found.</div>
                    )}
                    {!q.trim() && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                            <p style={{ fontSize: 14, fontWeight: 600 }}>Suggested</p>
                            <p style={{ fontSize: 12 }}>Find people to start a conversation with.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
