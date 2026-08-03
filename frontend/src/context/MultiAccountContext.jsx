/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useSyncExternalStore } from 'react'
import * as accountStore from '../lib/accountStore'

const MultiAccountContext = createContext(null)

export const MultiAccountProvider = ({ children }) => {
    // A view over the store rather than its own copy of the state. The previous
    // version seeded useState once at mount, so it drifted the moment anything
    // outside React (the axios token rotation) touched localStorage.
    const accounts = useSyncExternalStore(accountStore.subscribe, accountStore.readAccounts)

    const saveCurrentAccount = useCallback((user, tokens) => {
        accountStore.upsertAccount({
            user,
            accessToken: tokens?.accessToken,
            refreshToken: tokens?.refreshToken,
        })
        if (user?._id) accountStore.setActiveId(user._id)
    }, [])

    const switchAccount = useCallback((accountId) => {
        const target = accountStore.getAccount(accountId)
        if (!target || !target.refreshToken) return false

        // Mark the switch BEFORE touching anything, and drop the cached profile.
        // Without this the app boots showing the previous user while holding the
        // new user's tokens, and anything that pairs the two corrupts the list.
        accountStore.beginSwitch(accountId)
        accountStore.writeCachedUser(null)
        accountStore.setSession({
            accessToken: target.accessToken,
            refreshToken: target.refreshToken,
        })
        accountStore.setActiveId(accountId)

        // A full reload is deliberate. The QueryClient and the socket are module
        // level singletons and 20-odd components hold state derived from `user`;
        // reloading resets all of it for free and is provably complete.
        window.location.reload()
        return true
    }, [])

    const removeAccount = useCallback((accountId) => {
        accountStore.removeAccount(accountId)
    }, [])

    return (
        <MultiAccountContext.Provider value={{
            accounts,
            saveCurrentAccount,
            switchAccount,
            removeAccount,
        }}>
            {children}
        </MultiAccountContext.Provider>
    )
}

export const useMultiAccount = () => useContext(MultiAccountContext)
