import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login(form.email, form.password)
            toast.success('Welcome back!')
            navigate('/')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed')
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
                        <label>Email</label>
                        <input className="input" type="email" placeholder="you@example.com"
                            value={form.email} onChange={set('email')} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input className="input" type="password" placeholder="••••••••"
                            value={form.password} onChange={set('password')} required />
                    </div>
                    <motion.button className="btn btn-primary w-full" type="submit"
                        disabled={loading}
                        style={{ height: 46, marginTop: 4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign In'}
                    </motion.button>
                </form>

                <p className="auth-switch">
                    No account? <Link to="/register">Sign up</Link>
                </p>

                <div className="auth-hint">
                    <strong style={{ color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>🔑 Quick Login</strong>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Admin</span> admin@peernet.dev / Seed@1234<br />
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>User</span>{"  "} alice@peernet.dev / Seed@1234<br />
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Celeb</span> virat@peernet.dev / Celeb@1234
                </div>
            </motion.div>
        </div>
    )
}
