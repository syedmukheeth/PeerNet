import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'
import { GoogleLogin } from '@react-oauth/google'

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', fullName: '', password: '' })
    const [loading, setLoading] = useState(false)
    const { register, loginGoogle, loginGuest } = useAuth()
    const navigate = useNavigate()

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
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
        } catch (err) {
            toast.error('Google registration failed')
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

    const fields = [
        { k: 'fullName', label: 'Full Name', placeholder: 'Your Name', type: 'text' },
        { k: 'username', label: 'Username', placeholder: 'e.g. johnsmith', type: 'text' },
        { k: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' },
        { k: 'password', label: 'Password', placeholder: 'Min 8 chars', type: 'password' },
    ]

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
                <p className="auth-sub">Create your account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {fields.map(({ k, label, placeholder, type }) => (
                        <div key={k} className="input-group">
                            <label>{label}</label>
                            <input className="input" type={type} placeholder={placeholder}
                                value={form[k]} onChange={set(k)} required />
                        </div>
                    ))}
                    <motion.button className="btn btn-primary w-full" type="submit"
                        disabled={loading}
                        style={{ height: 46, marginTop: 4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create Account'}
                    </motion.button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="auth-social-wrap">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google registration failed')}
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
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </motion.div>
        </div>
    )
}
