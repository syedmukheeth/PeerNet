import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
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
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    // When adding a second account the user is deliberately signed in already,
    // so the usual "you are logged in, go home" redirect has to stand down.
    const isAddingAccount = params.get('addAccount') === '1'

    // Where to land after signing in. ProtectedRoute puts the URL the user
    // actually asked for in location.state, so a shared post link survives the
    // trip through the sign-in form instead of dumping them on the feed.
    const destination = location.state?.from || '/'

    // ── Redirect if already logged in ────────────────────────────────
    useEffect(() => {
        // replace, so the Back button does not bounce between /login and /.
        if (authUser && !isAddingAccount) navigate(destination, { replace: true })
    }, [authUser, isAddingAccount, navigate, destination]);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (loading) return

        setLoading(true)
        try {
            await login(form.identifier, form.password)
            toast.success('Welcome back!')
            navigate(destination, { replace: true })
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
            await loginGoogle(credentialResponse.credential)
            toast.success('Logged in with Google!')
            navigate(destination, { replace: true })
        } catch (err) {
            const msg = err.response?.data?.message || 'Google login failed'
            toast.error(msg, { id: 'google-error' })
        } finally { setLoading(false) }
    }

    const handleGuestLogin = async () => {
        if (loading) return
        setLoading(true)
        try {
            await loginGuest()
            toast.success('Welcome, Guest!', { id: 'guest-success' })
            navigate(destination, { replace: true })
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
                        {/* htmlFor/id: the labels were not associated with their
                            fields, so the inputs had no accessible name and
                            clicking a label did nothing. */}
                        <label className="auth-label" htmlFor="login-identifier">Username or Email</label>
                        <input id="login-identifier" className="input-field" type="text" placeholder="Username or Email"
                            autoComplete="username"
                            value={form.identifier} onChange={set('identifier')} required disabled={loading} />
                    </div>
                    <div className="input-group">
                        <label className="auth-label" htmlFor="login-password">Password</label>
                        <div className="relative">
                            <input
                                id="login-password"
                                className="input-field w-full"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                style={{ paddingRight: '45px' }}
                                value={form.password}
                                onChange={set('password')}
                                required
                                disabled={loading}
                            />

                            <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
