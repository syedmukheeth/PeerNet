import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'
import { GoogleLogin } from '@react-oauth/google'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function Login() {
    const [form, setForm] = useState({ identifier: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { login, loginGoogle, loginGuest } = useAuth()
    const navigate = useNavigate()

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login(form.identifier, form.password)
            toast.success('Welcome back!')
            navigate('/')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed')
        } finally { setLoading(false) }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true)
        try {
            await loginGoogle(credentialResponse.credential)
            toast.success('Logged in with Google!')
            navigate('/')
        } catch (err) {
            toast.error('Google login failed')
        } finally { setLoading(false) }
    }

    const handleGuestLogin = async () => {
        setLoading(true)
        try {
            await loginGuest()
            toast.success('Welcome, Guest!')
            navigate('/')
        } catch (err) {
            toast.error('Guest login failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />

            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
                <ThemeToggle />
            </div>

            <motion.div className="auth-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}>
                <div className="auth-logo-wrap">
                    <img src={logo} alt="PeerNet" className="auth-logo-img" />
                    <div className="auth-logo-text">PeerNet</div>
                </div>
                <p className="auth-sub">Sign in to your account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username or Email</label>
                        <input className="input" type="text" placeholder="johndoe or you@example.com"
                            value={form.identifier} onChange={set('identifier')} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-input-wrap" style={{ position: 'relative' }}>
                            <input 
                                className="input" 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="••••••••"
                                style={{ paddingRight: '45px' }}
                                value={form.password} 
                                onChange={set('password')} 
                                required 
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '5px'
                                }}
                            >
                                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                            </button>
                        </div>
                    </div>
                    <motion.button className="btn btn-primary w-full" type="submit"
                        disabled={loading}
                        style={{ height: 46, marginTop: 4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign In'}
                    </motion.button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="auth-social-wrap">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google login cancelled')}
                            theme="filled_black"
                            shape="pill"
                            width="100%"
                        />
                    </div>

                    <motion.button
                        className="btn btn-secondary w-full"
                        onClick={handleGuestLogin}
                        disabled={loading}
                        style={{ height: 40, marginTop: 12, fontSize: '13px' }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}>
                        Try as Guest
                    </motion.button>
                </div>

                <p className="auth-switch">
                    No account? <Link to="/register">Sign up</Link>
                </p>
            </motion.div>
        </div>
    )
}
