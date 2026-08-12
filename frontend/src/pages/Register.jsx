import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
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
    const navigate = useNavigate()

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!acceptedTerms) return toast.error('Please accept the Terms of Service')
        setLoading(true)
        try {
            await register(form)
            toast.success('Welcome to PeerNet!')
            navigate('/')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed')
        } finally { setLoading(false) }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true)
        try {
            await loginGoogle(credentialResponse.credential)
            toast.success('Joined PeerNet with Google!')
            navigate('/')
        } catch {
            toast.error('Google registration failed')
        } finally { setLoading(false) }
    }

    const handleGuestLogin = async () => {
        setLoading(true)
        try {
            await loginGuest()
            toast.success('Welcome, Guest!')
            navigate('/')
        } catch {
            toast.error('Guest login failed')
        } finally { setLoading(false) }
    }

    const fields = [
        { k: 'fullName', label: 'Full name', placeholder: 'Your name', type: 'text' },
        { k: 'username', label: 'Username', placeholder: 'e.g. alex_r', type: 'text' },
        { k: 'email', label: 'Email address', placeholder: 'you@example.com', type: 'email' },
        { k: 'password', label: 'Password', placeholder: 'At least 8 characters', type: 'password' },
    ]

    return (
        <div className="auth-page">
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
                <ThemeToggle />
            </div>

            <div className="auth-card">
                <div className="auth-logo-wrap">
                    <img src={logo} alt="PeerNet" className="auth-logo-img" />
                    <div className="auth-logo-text">PeerNet</div>
                </div>

                <p className="auth-sub">Create your account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {fields.map(({ k, label, placeholder, type }) => (
                        <div key={k} className="input-group">
                            {/* htmlFor/id, so the label is actually associated
                                with its field rather than just sitting above
                                it. Without the pairing a screen reader reads an
                                unnamed input and clicking the label does
                                nothing. */}
                            <label className="auth-label" htmlFor={`register-${k}`}>{label}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id={`register-${k}`}
                                    className="input-field w-full"
                                    type={k === 'password' ? (showPassword ? 'text' : 'password') : type}
                                    placeholder={placeholder}
                                    autoComplete={
                                        k === 'password' ? 'new-password'
                                            : k === 'email' ? 'email'
                                                : k === 'username' ? 'username'
                                                    : 'name'
                                    }
                                    value={form[k]}
                                    onChange={set(k)}
                                    required
                                    style={k === 'password' ? { paddingRight: 44 } : {}}
                                />
                                {k === 'password' && (
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                                        onClick={() => setShowPassword(!showPassword)}
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

                    <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ height: 48 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create account'}
                    </button>
                </form>

                <div className="auth-divider"><span>OR</span></div>

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
                        Try as guest
                    </button>
                </div>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
