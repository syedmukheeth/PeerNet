import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get('/users/me')
            setUser(data.data)
        } catch {
            setUser(null)
            localStorage.removeItem('accessToken')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (token) fetchMe()
        else setLoading(false)
    }, [fetchMe])

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('accessToken', data.data.accessToken)
        setUser(data.data.user)
        return data.data.user
    }

    const register = async (payload) => {
        const { data } = await api.post('/auth/register', payload)
        localStorage.setItem('accessToken', data.data.accessToken)
        setUser(data.data.user)
        return data.data.user
    }

    const logout = async () => {
        try { await api.post('/auth/logout') } catch { /* ignore */ }
        localStorage.removeItem('accessToken')
        setUser(null)
    }

    const updateUser = (updates) => setUser((u) => ({ ...u, ...updates }))

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
