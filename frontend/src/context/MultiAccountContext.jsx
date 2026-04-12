/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'

// Schema stored in localStorage under 'pn_accounts':
// [{ id, username, fullName, avatarUrl, role, accessToken, refreshToken }]

const ACCOUNTS_KEY = 'pn_accounts'

const readAccounts = () => {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [] } catch { return [] }
}

const writeAccounts = (accounts) => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

const MultiAccountContext = createContext(null)

export const MultiAccountProvider = ({ children }) => {
    const [accounts, setAccounts] = useState(() => readAccounts())

    const _sync = (updated) => {
        writeAccounts(updated)
        setAccounts(updated)
    }

    // Save/update the current session into the accounts list
    const saveCurrentAccount = useCallback((user) => {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        if (!user || !accessToken) return

        const existing = readAccounts()
        const idx = existing.findIndex(a => a.id === user._id)
        const entry = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || '',
            role: user.role,
            accessToken,
            refreshToken,
        }
        if (idx >= 0) {
            existing[idx] = entry
        } else {
            existing.push(entry)
        }
        _sync(existing)
    }, [])

    // Switch to an existing stored account
    const switchAccount = useCallback((accountId) => {
        const existing = readAccounts()
        const target = existing.find(a => a.id === accountId)
        if (!target) return false

        localStorage.setItem('accessToken', target.accessToken)
        localStorage.setItem('refreshToken', target.refreshToken)
        // Force a full page reload so AuthContext re-validates the new session
        window.location.reload()
        return true
    }, [])

    // Remove an account from the store
    const removeAccount = useCallback((accountId) => {
        const updated = readAccounts().filter(a => a.id !== accountId)
        _sync(updated)
    }, [])

    // Refresh stored tokens for the current active account (called after token refresh)
    const refreshStoredAccount = useCallback((userId) => {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        const existing = readAccounts()
        const idx = existing.findIndex(a => a.id === userId)
        if (idx >= 0) {
            existing[idx].accessToken = accessToken
            existing[idx].refreshToken = refreshToken
            writeAccounts(existing)
        }
    }, [])

    return (
        <MultiAccountContext.Provider value={{
            accounts,
            saveCurrentAccount,
            switchAccount,
            removeAccount,
            refreshStoredAccount,
        }}>
            {children}
        </MultiAccountContext.Provider>
    )
}

export const useMultiAccount = () => useContext(MultiAccountContext)
