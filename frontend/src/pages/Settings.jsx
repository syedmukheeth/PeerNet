import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
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
    const { user, logout, updateUser } = useAuth()
    const navigate = useNavigate()

    // Profile update state
    const [editMode, setEditMode] = useState(null) // 'username' | 'email' | null
    const [profileDraft, setProfileDraft] = useState({
        username: '',
        email: '',
        currentPassword: '',
    })
    const [updateLoading, setUpdateLoading] = useState(false)

    // ── Context Sync ────────────────────────────────────────────
    // There used to be a `mounted` flag set from an effect purely to gate the
    // render, so the skeleton flashed on every visit even when the user was
    // already in context. Gating on `user` alone is the same check without the
    // extra paint.
    useEffect(() => {
        if (user) {
            setProfileDraft((d) => ({
                ...d,
                username: user.username || '',
                email: user.email || ''
            }))
        }
    }, [user])

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
        const username = profileDraft.username.trim()
        const email = profileDraft.email.trim()

        if (!username || !email) {
            return toast.error('Fields cannot be empty')
        }

        // Changing the email is a credential change, not a profile edit: it is
        // the account's recovery identity. The server refuses it without the
        // current password, so ask for it here rather than surfacing a 400.
        const emailChanged = email !== user.email
        if (emailChanged && !profileDraft.currentPassword) {
            return toast.error('Enter your current password to change your email')
        }

        setUpdateLoading(true)
        try {
            const payload = { username, email }
            if (emailChanged) payload.currentPassword = profileDraft.currentPassword

            const { data } = await api.patch('/users/me', payload)
            // Updates the context in place. This used to call
            // window.location.reload(), which rebooted the whole app, replayed
            // the splash screen and dropped the socket connection to reflect a
            // one-field change.
            updateUser(data.data)
            setProfileDraft((d) => ({ ...d, currentPassword: '' }))
            setEditMode(null)
            toast.success(emailChanged ? 'Profile updated. Please verify your new email.' : 'Profile updated')
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

    if (!user) {
        return (
            <div className="settings-page p-6 max-w-2xl mx-auto space-y-12">
                <div className="space-y-4">
                    <div className="skeleton h-8 w-32 rounded-lg" />
                    <div className="skeleton h-4 w-64 rounded-md" />
                </div>
                <div className="space-y-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-4">
                            <div className="skeleton h-4 w-24 rounded-md" />
                            <div className="skeleton h-32 w-full rounded-2xl" />
                        </div>
                    ))}
                </div>
            </div>
        )
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
                            <>
                                <label className="sr-only" htmlFor="settings-username">Username</label>
                                <input
                                    id="settings-username"
                                    autoComplete="username"
                                    className="settings-input"
                                    value={profileDraft.username}
                                    onChange={(e) => setProfileDraft(d => ({ ...d, username: e.target.value }))}
                                    autoFocus
                                />
                            </>
                        ) : (
                            <span className="settings-row-value">@{user?.username}</span>
                        )}
                    </div>
                    {editMode === 'username' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="settings-edit-btn" style={{ color: 'var(--text-3)' }} onClick={() => setEditMode(null)}>Cancel</button>
                            <button className="settings-edit-btn" onClick={handleUpdateProfile} disabled={updateLoading}>
                                {updateLoading ? '...' : 'Save'}
                            </button>
                        </div>
                    ) : (
                        <button className="settings-edit-btn" onClick={() => {
                            setProfileDraft({ username: user?.username, email: user?.email, currentPassword: '' })
                            setEditMode('username')
                        }}>Edit</button>
                    )}
                </div>

                <div className={`settings-row ${editMode === 'email' ? 'active' : ''}`}>
                    <div className="settings-row-icon"><HiShieldCheck /></div>
                    <div className="settings-row-content">
                        <span className="settings-row-label">Email</span>
                        {editMode === 'email' ? (
                            <>
                                <label className="sr-only" htmlFor="settings-email">Email address</label>
                                <input
                                    id="settings-email"
                                    type="email"
                                    autoComplete="email"
                                    className="settings-input"
                                    value={profileDraft.email}
                                    onChange={(e) => setProfileDraft(d => ({ ...d, email: e.target.value }))}
                                    autoFocus
                                />
                                {/* The server requires the current password to
                                    move an account's email, since that address
                                    is the recovery identity. */}
                                <label className="sr-only" htmlFor="settings-email-password">Current password</label>
                                <input
                                    id="settings-email-password"
                                    type="password"
                                    autoComplete="current-password"
                                    className="settings-input"
                                    placeholder="Current password"
                                    value={profileDraft.currentPassword}
                                    onChange={(e) => setProfileDraft(d => ({ ...d, currentPassword: e.target.value }))}
                                />
                            </>
                        ) : (
                            <span className="settings-row-value">{user?.email}</span>
                        )}
                    </div>
                    {editMode === 'email' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="settings-edit-btn" style={{ color: 'var(--text-3)' }} onClick={() => setEditMode(null)}>Cancel</button>
                            <button className="settings-edit-btn" onClick={handleUpdateProfile} disabled={updateLoading}>
                                {updateLoading ? '...' : 'Save'}
                            </button>
                        </div>
                    ) : (
                        <button className="settings-edit-btn" onClick={() => {
                            setProfileDraft({ username: user?.username, email: user?.email, currentPassword: '' })
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
                        {/* Labelled and autoComplete-annotated: these were
                            placeholder-only, so screen readers announced three
                            unnamed password boxes and password managers could
                            not tell the current one from the new one. */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label className="sr-only" htmlFor="pw-current">Current password</label>
                            <input
                                id="pw-current"
                                className="input"
                                type="password"
                                name="currentPassword"
                                autoComplete="current-password"
                                placeholder="Current password"
                                value={pwForm.currentPassword}
                                onChange={handlePwChange}
                            />
                            <label className="sr-only" htmlFor="pw-new">New password</label>
                            <input
                                id="pw-new"
                                className="input"
                                type="password"
                                name="newPassword"
                                autoComplete="new-password"
                                placeholder="New password"
                                value={pwForm.newPassword}
                                onChange={handlePwChange}
                            />
                            <label className="sr-only" htmlFor="pw-confirm">Confirm new password</label>
                            <input
                                id="pw-confirm"
                                className="input"
                                type="password"
                                name="confirmPassword"
                                autoComplete="new-password"
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
                {/* Read from package.json at build time via vite's define, so
                    it cannot drift from the real version the way the previously
                    hard-coded "v1.0.0" had. */}
                PeerNet · v{__APP_VERSION__}
            </p>
        </div>
    )
}
