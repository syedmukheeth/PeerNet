import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { HiLockClosed, HiUser, HiLogout, HiShieldCheck, HiChevronRight } from 'react-icons/hi'

function SettingsSection({ title, children }) {
    return (
        <div className="settings-section">
            <h3 className="settings-section-title">{title}</h3>
            <div className="settings-card">{children}</div>
        </div>
    )
}

function SettingsRow({ icon, label, value, danger, onClick, chevron = true }) {
    return (
        <motion.button
            className={`settings-row ${danger ? 'danger' : ''}`}
            onClick={onClick}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.99 }}>
            <div className="settings-row-icon">{icon}</div>
            <div className="settings-row-content">
                <span className="settings-row-label">{label}</span>
                {value && <span className="settings-row-value">{value}</span>}
            </div>
            {chevron && <HiChevronRight style={{ opacity: 0.4, fontSize: 18 }} />}
        </motion.button>
    )
}

export default function Settings() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // Profile update state
    const [editMode, setEditMode] = useState(null) // 'username' | 'email' | null
    const [profileDraft, setProfileDraft] = useState({ 
        username: user?.username || '', 
        email: user?.email || '' 
    })
    const [updateLoading, setUpdateLoading] = useState(false)

    // Change password state
    const [showPwForm, setShowPwForm] = useState(false)
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [pwLoading, setPwLoading] = useState(false)

    const handlePwChange = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleChangePassword = async () => {
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            return toast.error('New passwords do not match')
        }
        if (pwForm.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters')
        }
        setPwLoading(true)
        try {
            await api.patch('/auth/change-password', {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            })
            toast.success('Password changed!')
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setShowPwForm(false)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password')
        } finally {
            setPwLoading(false)
        }
    }

    const handleUpdateProfile = async () => {
        if (!profileDraft.username.trim() || !profileDraft.email.trim()) {
            return toast.error('Fields cannot be empty')
        }
        setUpdateLoading(true)
        try {
            await api.patch('/users/me', {
                username: profileDraft.username.trim(),
                email: profileDraft.email.trim()
            })
            toast.success('Profile updated!')
            setEditMode(null)
            // Hard refresh to update context (could be improved with a local context update)
            window.location.reload()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile')
        } finally {
            setUpdateLoading(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <div className="settings-page fade-in">
            <div className="settings-header">
                <h1 className="t-heading" style={{ fontSize: 24 }}>Settings</h1>
                <p className="t-small" style={{ marginTop: 4 }}>Manage your account and preferences</p>
            </div>

            {/* Account Info */}
            <SettingsSection title="Account">
                <div className={`settings-row ${editMode === 'username' ? 'active' : ''}`}>
                    <div className="settings-row-icon"><HiUser /></div>
                    <div className="settings-row-content">
                        <span className="settings-row-label">Username</span>
                        {editMode === 'username' ? (
                            <input
                                className="input input-sm"
                                style={{ marginTop: 8 }}
                                value={profileDraft.username}
                                onChange={(e) => setProfileDraft(d => ({ ...d, username: e.target.value }))}
                                autoFocus
                            />
                        ) : (
                            <span className="settings-row-value">@{user?.username}</span>
                        )}
                    </div>
                    {editMode === 'username' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => setEditMode(null)}>Cancel</button>
                            <button className="btn btn-primary btn-xs" onClick={handleUpdateProfile} disabled={updateLoading}>Save</button>
                        </div>
                    ) : (
                        <button className="settings-edit-btn" onClick={() => {
                            setProfileDraft({ username: user?.username, email: user?.email })
                            setEditMode('username')
                        }}>Edit</button>
                    )}
                </div>

                <div className={`settings-row ${editMode === 'email' ? 'active' : ''}`}>
                    <div className="settings-row-icon"><HiShieldCheck /></div>
                    <div className="settings-row-content">
                        <span className="settings-row-label">Email</span>
                        {editMode === 'email' ? (
                            <input
                                className="input input-sm"
                                style={{ marginTop: 8 }}
                                value={profileDraft.email}
                                onChange={(e) => setProfileDraft(d => ({ ...d, email: e.target.value }))}
                                autoFocus
                            />
                        ) : (
                            <span className="settings-row-value">{user?.email}</span>
                        )}
                    </div>
                    {editMode === 'email' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => setEditMode(null)}>Cancel</button>
                            <button className="btn btn-primary btn-xs" onClick={handleUpdateProfile} disabled={updateLoading}>Save</button>
                        </div>
                    ) : (
                        <button className="settings-edit-btn" onClick={() => {
                            setProfileDraft({ username: user?.username, email: user?.email })
                            setEditMode('email')
                        }}>Edit</button>
                    )}
                </div>
            </SettingsSection>

            {/* Security */}
            <SettingsSection title="Security">
                <SettingsRow
                    icon={<HiLockClosed />}
                    label="Change Password"
                    onClick={() => setShowPwForm(o => !o)}
                />
                {showPwForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ padding: '16px 16px 4px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input
                                className="input"
                                type="password"
                                name="currentPassword"
                                placeholder="Current password"
                                value={pwForm.currentPassword}
                                onChange={handlePwChange}
                            />
                            <input
                                className="input"
                                type="password"
                                name="newPassword"
                                placeholder="New password"
                                value={pwForm.newPassword}
                                onChange={handlePwChange}
                            />
                            <input
                                className="input"
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm new password"
                                value={pwForm.confirmPassword}
                                onChange={handlePwChange}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowPwForm(false)}>Cancel</button>
                                <motion.button
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1 }}
                                    onClick={handleChangePassword}
                                    disabled={pwLoading}
                                    whileHover={{ scale: 1.02 }}>
                                    {pwLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Update Password'}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </SettingsSection>

            {/* Sign Out */}
            <SettingsSection title="Session">
                <SettingsRow
                    icon={<HiLogout />}
                    label="Sign Out"
                    danger
                    chevron={false}
                    onClick={handleLogout}
                />
            </SettingsSection>

            <p className="t-small" style={{ textAlign: 'center', marginTop: 32, opacity: 0.4 }}>
                PeerNet · v1.0.0
            </p>
        </div>
    )
}
