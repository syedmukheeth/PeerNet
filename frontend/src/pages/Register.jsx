import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMultiAccount } from '../context/MultiAccountContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'
import { GoogleLogin } from '@react-oauth/google'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', fullName: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    
    const { register, loginGoogle, loginGuest } = useAuth()
    const { saveCurrentAccount } = useMultiAccount()
    const navigate = useNavigate()

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!acceptedTerms) return toast.error('Please accept the Terms of Service')
        setLoading(true)
        try {
            const user = await register(form)
            saveCurrentAccount(user)
            toast.success('Welcome to PeerNet!')
            navigate('/')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed')
        } finally { setLoading(false) }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true)
        try {
            const user = await loginGoogle(credentialResponse.credential)
            saveCurrentAccount(user)
            toast.success('Joined PeerNet with Google!')
            navigate('/')
        } catch {
            toast.error('Google registration failed')
        } finally { setLoading(false) }
    }

    const handleGuestLogin = async () => {
        setLoading(true)
        try {
            const user = await loginGuest()
            saveCurrentAccount(user)
            toast.success('Welcome, Guest!')
            navigate('/')
        } catch {
            toast.error('Guest login failed')
        } finally { setLoading(false) }
    }

    const fields = [
        { k: 'fullName', label: 'Full Name', placeholder: 'Your Name', type: 'text' },
        { k: 'username', label: 'Interstellar Username', placeholder: 'e.g. stargazer_01', type: 'text' },
        { k: 'email', label: 'Email Address', placeholder: 'you@universe.com', type: 'email' },
        { k: 'password', label: 'Quantum Password', placeholder: 'Min 8 characters', type: 'password' },
    ]

    return (
        <div className="auth-page">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />

            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
                <ThemeToggle />
            </div>

            <motion.div className="auth-card"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}>
                
                <div className="auth-logo-wrap">
                    <img src={logo} alt="PeerNet" className="auth-logo-img" />
                    <div className="auth-logo-text">PeerNet</div>
                </div>
                
                <p className="auth-sub">Initialize your digital presence</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {fields.map(({ k, label, placeholder, type }) => (
                        <div key={k} className="input-group">
                            <label className="t-small">{label}</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    className="input" 
                                    type={k === 'password' ? (showPassword ? 'text' : 'password') : type} 
                                    placeholder={placeholder}
                                    value={form[k]} 
                                    onChange={set(k)} 
                                    required 
                                    style={k === 'password' ? { paddingRight: 44 } : {}}
                                />
                                {k === 'password' && (
                                    <button 
                                        type="button" 
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div 
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0 24px', cursor: 'pointer' }} 
                        onClick={() => setAcceptedTerms(!acceptedTerms)}
                    >
                        <input 
                            type="checkbox" 
                            checked={acceptedTerms} 
                            onChange={() => {}} 
                            style={{ width: 17, height: 17, marginTop: 2, accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                            I accept the <Link to="/legal/terms" target="_blank" onClick={e => e.stopPropagation()} className="t-accent hover:underline">Terms of Service</Link> and <Link to="/legal/privacy" target="_blank" onClick={e => e.stopPropagation()} className="t-accent hover:underline">Privacy Policy</Link>
                        </span>
                    </div>

                    <motion.button className="btn btn-primary w-full" type="submit"
                        disabled={loading}
                        style={{ height: 48 }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Establish Account'}
                    </motion.button>
                </form>

                <div className="auth-divider"><span>SECURE AUTH</span></div>

                <div className="auth-social-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google registration failed')}
                            theme="filled_black"
                            shape="pill"
                            width="100%"
                        />
                    </div>
                    <button className="btn btn-secondary w-full text-xs" onClick={handleGuestLogin} disabled={loading}>
                        Continue as Guest
                    </button>
                </div>

                <p className="auth-switch">
                    Existing user? <Link to="/login" className="t-accent">Access Portal</Link>
                </p>
            </motion.div>
        </div>
    )
}
