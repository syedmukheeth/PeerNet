import { useState, useCallback, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import ComplianceNotice from './components/ComplianceNotice'
import ErrorBoundary from './components/ErrorBoundary'

const Feed = lazy(() => import('./pages/Feed'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Messages = lazy(() => import('./pages/Messages'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Search = lazy(() => import('./pages/Search'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Admin = lazy(() => import('./pages/admin/AdminPage'))
const About = lazy(() => import('./pages/About'))
const Help = lazy(() => import('./pages/Help'))
const NotFound = lazy(() => import('./pages/NotFound'))

const RouteSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
    <div className="spinner" style={{ width: 40, height: 40 }} />
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <RouteSpinner />
  // Carries the attempted URL so Login can return the user to it. Without this
  // every deep link a signed-out user opened (a shared post, a conversation)
  // was lost and they landed on the feed instead.
  return user
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <RouteSpinner />
  // superadmin outranks admin everywhere else in the app, but was locked out
  // of the console by an exact-equality check.
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <Navigate to="/" replace />
  }
  return children
}

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  if (loading) return <RouteSpinner />
  // ?addAccount=1 lets a signed-in user reach the sign-in form to add a second
  // account. Without it the switcher's "Log into an existing account" bounced
  // straight back to the feed, so adding an account was impossible.
  if (user && params.get('addAccount') !== '1') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('pn_splashed') === '1'
  )

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('pn_splashed', '1')
    setSplashDone(true)
  }, [])

  return (
    <HelmetProvider>
      {/*
        The splash is an overlay, not a gate. Rendering the routes only after it
        finished meant roughly a second of nothing at all on a cold session, so
        a deep link (a shared post) showed a blank page before it began loading.
      */}
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <ErrorBoundary>
        <Suspense fallback={<RouteSpinner />}>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

            {/* Protected app */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Feed />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="messages/:convoId" element={<Messages />} />
              <Route path="search" element={<Search />} />
              <Route path="profile/:id" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
            </Route>

            {/* Public/shared routes, viewable without logging in */}
            <Route element={<Layout />}>
              <Route path="/posts/:id" element={<PostDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<Help />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              <Route path="/legal/terms" element={<Terms />} />
            </Route>

            {/* Old paths kept working */}
            <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
            <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />

            {/* A real 404. This used to redirect to "/", which made a typo or
                a deleted post indistinguishable from a normal feed load. */}
            <Route element={<Layout />}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <ComplianceNotice />
    </HelmetProvider>
  )
}
