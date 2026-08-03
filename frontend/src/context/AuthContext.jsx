/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { queryClient } from '../lib/queryClient'
import * as accountStore from '../lib/accountStore'

const AuthContext = createContext(null)

// On boot the cached profile is only trustworthy when it describes the account
// whose tokens are actually installed. During a switch it describes the previous
// account, so it has to be ignored until /users/me answers.
const initialUser = () => {
    if (accountStore.getPendingSwitch()) return null
    const cached = accountStore.readCachedUser()
    if (!cached) return null
    const activeId = accountStore.getActiveId()
    // No activeId means this session predates the store; trust the cache then.
    if (activeId && cached._id !== activeId) return null
    return cached
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(initialUser)
    // Only show the full page spinner when there is nothing trustworthy to paint.
    const [loading, setLoading] = useState(() => !initialUser())

    const _setUser = (u) => {
        setUser(u)
        accountStore.writeCachedUser(u)
    }

    // Records the session. Tokens come from the same response as the user, never
    // read back out of localStorage, so identity and credentials cannot desync.
    const _adopt = (data) => {
        const { user: u, accessToken, refreshToken } = data
        accountStore.setSession({ accessToken, refreshToken })
        accountStore.setActiveId(u._id)
        accountStore.upsertAccount({ user: u, accessToken, refreshToken })
        accountStore.clearSwitch()
        _setUser(u)
        return u
    }

    const fetchMe = useCallback(async () => {
        const wasSwitching = Boolean(accountStore.getPendingSwitch())
        try {
            const { data } = await api.get('/users/me')
            const me = data.data

            // This is the only place a stored entry is written from a background
            // fetch, and the user it writes was just verified by the server
            // against the tokens that authenticated this very request.
            accountStore.setActiveId(me._id)
            accountStore.upsertAccount({
                user: me,
                accessToken: accountStore.getAccessToken(),
                refreshToken: accountStore.getRefreshToken(),
            })
            accountStore.clearSwitch()
            _setUser(me)
        } catch (err) {
            const status = err.response?.status
            if (status === 401 || status === 403) {
                // axios already tried to refresh and failed, so this session is
                // genuinely dead. Drop it from the list instead of leaving an
                // entry that can never be switched to again.
                const dead = accountStore.getPendingSwitch() || accountStore.getActiveId()
                if (dead) accountStore.removeAccount(dead)
                accountStore.clearSession()
                _setUser(null)
                if (wasSwitching) toast.error('That session has expired. Please sign in again.')
            }
            // Anything else is a network blip or a cold start on the API. Keeping
            // the cached session is far better than logging everyone out, which
            // is what the unconditional wipe here used to do.
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // Skip entirely for logged out visitors so they do not get 401 spam.
        if (accountStore.getAccessToken()) fetchMe()
        else setLoading(false)
    }, [fetchMe])

    const login = async (identifier, password) => {
        const { data } = await api.post('/auth/login', { email: identifier, password }, { withCredentials: true })
        return _adopt(data.data)
    }

    const register = async (payload) => {
        const { data } = await api.post('/auth/register', payload, { withCredentials: true })
        return _adopt(data.data)
    }

    const loginGoogle = async (token) => {
        const { data } = await api.post('/auth/google', { token }, { withCredentials: true })
        return _adopt(data.data)
    }

    const loginGuest = async () => {
        const { data } = await api.post('/auth/guest', {}, { withCredentials: true })
        return _adopt(data.data)
    }

    const logout = async () => {
        const activeId = accountStore.getActiveId()
        try {
            // The refresh token goes in the body: the server prefers it over the
            // cookie, which with several sessions in one browser names whichever
            // account signed in last rather than the one being logged out.
            await api.post(
                '/auth/logout',
                { refreshToken: accountStore.getRefreshToken() },
                { withCredentials: true },
            )
        } catch { /* the local session is torn down either way */ }

        if (activeId) accountStore.removeAccount(activeId)
        accountStore.clearSession()
        queryClient.clear()
        _setUser(null)
    }

    const updateUser = (updates) => _setUser({ ...user, ...updates })

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe, updateUser, loginGoogle, loginGuest }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
