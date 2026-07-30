import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMultiAccount } from '../context/MultiAccountContext'
import toast from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'
import { GoogleLogin } from '@react-oauth/google'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function Login() {
    const [form, setForm] = useState({ identifier: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { login, loginGoogle, loginGuest, user: authUser } = useAuth()
    const { saveCurrentAccount } = useMultiAccount()
    const navigate = useNavigate()

    // ── Redirect if already logged in ────────────────────────────────
    useEffect(() => {
        if (authUser) navigate('/')
    }, [authUser, navigate]);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (loading) return

        setLoading(true)
        try {
            const user = await login(form.identifier, form.password)
            saveCurrentAccount(user)
            toast.success('Welcome back!')
            navigate('/')
        } catch (err) {
            let msg = 'Login failed';
            if (err.response) {
                msg = err.response.data?.message || `Server error (${err.response.status})`;
            } else if (err.request) {
                msg = 'Cannot reach server. Is the backend running?';
            } else {
                msg = err.message;
            }
            // Deduplicate toasts using a unique ID
            toast.error(msg, { id: 'login-error' })
        } finally {
            setLoading(false)
        }
    }


    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true)
        try {
            const user = await loginGoogle(credentialResponse.credential)
            saveCurrentAccount(user)
            toast.success('Logged in with Google!')
            navigate('/')
        } catch (err) {
            const msg = err.response?.data?.message || 'Google login failed'
            toast.error(msg, { id: 'google-error' })
        } finally { setLoading(false) }
    }

    const handleGuestLogin = async () => {
        if (loading) return
        setLoading(true)
        try {
            const user = await loginGuest()
            saveCurrentAccount(user)
            toast.success('Welcome, Guest!', { id: 'guest-success' })
            navigate('/')
        } catch (err) {
            const msg = err.response?.data?.message || 'Guest login failed'
            toast.error(msg, { id: 'guest-error' })
        } finally { setLoading(false) }
    }

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
                <p className="auth-sub">Sign in to your account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="auth-label">Username or Email</label>
                        <input className="input-field" type="text" placeholder="Username or Email"
                            value={form.identifier} onChange={set('identifier')} required disabled={loading} />
                    </div>
                    <div className="input-group">
                        <label className="auth-label">Password</label>
                        <div className="relative">
                            <input 
                                className="input-field w-full" 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="••••••••"
                                style={{ paddingRight: '45px' }}
                                value={form.password} 
                                onChange={set('password')} 
                                required 
                                disabled={loading}
                            />

                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                            </button>
                        </div>
                    </div>
                    <button className="btn btn-primary w-full" type="submit" disabled={loading}
                        style={{ height: 46, marginTop: 4 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign in'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="auth-social-wrap">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google login cancelled', { id: 'google-cancel' })}
                            theme="filled_black"
                            shape="pill"
                            width={320}
                        />
                    </div>

                    <button
                        className="btn btn-secondary w-full"
                        onClick={handleGuestLogin}
                        disabled={loading}
                        style={{ height: 40, marginTop: 12, fontSize: '13px' }}>
                        {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Try as guest'}
                    </button>
                </div>

                <p className="auth-switch">
                    No account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    )
}
