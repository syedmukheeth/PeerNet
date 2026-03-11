import { useState, useCallback, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'

const Feed = lazy(() => import('./pages/Feed'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Reels = lazy(() => import('./pages/Reels'))
const Messages = lazy(() => import('./pages/Messages'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Search = lazy(() => import('./pages/Search'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const Settings = lazy(() => import('./pages/Settings'))

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  )
  return !user ? children : <Navigate to="/" replace />
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
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      {splashDone && (
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        }>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

            {/* Protected app */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Feed />} />
              <Route path="dscrolls" element={<Reels />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="messages/:id" element={<Messages />} />
              <Route path="search" element={<Search />} />
              <Route path="profile/:id" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Public/Shared routes (can be viewed without login) */}
            <Route element={<Layout />}>
              <Route path="/posts/:id" element={<PostDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </>
  )
}
