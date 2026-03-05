import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

const USER_KEY = 'pn_user'

const readCached = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}
const writeCache = (u) => {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
}

export const AuthProvider = ({ children }) => {
    // Restore from cache instantly — eliminates the white-screen flash
    const [user, setUser] = useState(() => readCached())
    // Only show the full-page spinner on very first load (no cached user)
    const [loading, setLoading] = useState(() => !readCached())

    const _setUser = (u) => { setUser(u); writeCache(u) }

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get('/users/me')
            _setUser(data.data)
        } catch {
            // If background refresh fails AND we have no cached user → force logout
            // If we DO have a cached user, keep them logged in optimistically
            if (!readCached()) {
                _setUser(null)
                localStorage.removeItem('accessToken')
            }
        } finally {
            setLoading(false)
        }
    }, []) // eslint-disable-line

    useEffect(() => {
        // Always silently validate session on mount.
        // If there's a cached user, loading is already false so no flash.
        // Axios interceptor auto-uses the refresh-token cookie when access token expires.
        fetchMe()
    }, [fetchMe])

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('accessToken', data.data.accessToken)
        _setUser(data.data.user)
        return data.data.user
    }

    const register = async (payload) => {
        const { data } = await api.post('/auth/register', payload)
        localStorage.setItem('accessToken', data.data.accessToken)
        _setUser(data.data.user)
        return data.data.user
    }

    const logout = async () => {
        try { await api.post('/auth/logout') } catch { /* ignore */ }
        localStorage.removeItem('accessToken')
        _setUser(null)
    }

    const updateUser = (updates) => _setUser({ ...user, ...updates })

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

