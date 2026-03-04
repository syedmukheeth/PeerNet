import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { HiX, HiCamera } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function EditProfileModal({ profile, onClose, onSave }) {
    const { updateUser } = useAuth()
    const [form, setForm] = useState({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        website: profile.website || '',
    })
    const [avatar, setAvatar] = useState(null)
    const [preview, setPreview] = useState(profile.avatarUrl || null)
    const [loading, setLoading] = useState(false)
    const fileRef = useRef()

    const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleAvatarChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setAvatar(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const fd = new FormData()
            fd.append('fullName', form.fullName)
            fd.append('bio', form.bio)
            fd.append('website', form.website)
            if (avatar) fd.append('avatar', avatar)

            const { data } = await api.patch('/users/me', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            updateUser(data.data)
            toast.success('Profile updated!')
            onSave(data.data)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal-card"
                style={{ maxWidth: 480 }}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 className="t-heading" style={{ fontSize: 17 }}>Edit Profile</h2>
                    <motion.button className="btn btn-ghost btn-icon-sm" onClick={onClose}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <HiX style={{ fontSize: 18 }} />
                    </motion.button>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current.click()}>
                        <img
                            src={preview || `https://ui-avatars.com/api/?name=${profile.username}&size=200&background=6366F1&color=fff`}
                            alt="avatar"
                            style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: 'var(--accent)', borderRadius: '50%',
                            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                            <HiCamera />
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    </div>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="t-small" style={{ marginBottom: 6, display: 'block', fontWeight: 600 }}>Full Name</label>
                        <input className="input" name="fullName" value={form.fullName}
                            onChange={handleField} placeholder="Your full name" />
                    </div>
                    <div>
                        <label className="t-small" style={{ marginBottom: 6, display: 'block', fontWeight: 600 }}>Bio</label>
                        <textarea className="input" name="bio" value={form.bio}
                            onChange={handleField} placeholder="Tell the world about yourself…"
                            rows={3} style={{ resize: 'none' }} />
                    </div>
                    <div>
                        <label className="t-small" style={{ marginBottom: 6, display: 'block', fontWeight: 600 }}>Website</label>
                        <input className="input" name="website" value={form.website}
                            onChange={handleField} placeholder="https://yoursite.com" />
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <motion.button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleSave}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Changes'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    )
}
