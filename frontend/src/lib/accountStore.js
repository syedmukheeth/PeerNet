/*
 * Single owner of every auth related key in localStorage.
 *
 * This is a plain module rather than a React context on purpose: api/axios.js
 * lives outside the component tree and has to write rotated tokens back into the
 * stored account. The previous design put that job in a context callback which
 * was exported but never called, so stored refresh tokens went stale on every
 * rotation and switching to an older account failed.
 *
 * The invariant that matters: an account entry is only ever written from a
 * user object and the tokens that came back in the SAME response. Nothing here
 * reads the ambient localStorage tokens and guesses which user they belong to.
 * That guess is what corrupted the list before, collapsing every entry onto
 * whichever token happened to be installed at the time.
 */

const ACCOUNTS_KEY = 'pn_accounts'
const ACTIVE_KEY = 'pn_active_id'
const SWITCH_KEY = 'pn_switch_pending'
const ACCESS_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'
const USER_KEY = 'pn_user'

// Refresh tokens are minted with a 30 day expiry, so an entry older than that
// can only fail. Capping the list bounds how much an XSS could walk away with:
// these are long lived credentials sitting in localStorage, which is inherent
// to client side multi account, not something this module can fix.
const MAX_ACCOUNTS = 5
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const listeners = new Set()

const emit = () => {
    for (const fn of listeners) fn()
}

export const subscribe = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
}

const isUsableToken = (t) =>
    typeof t === 'string' && t.length > 0 && t !== 'undefined' && t !== 'null'

const readRaw = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY))
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const writeRaw = (accounts) => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    emit()
}

// Cached so useSyncExternalStore gets a stable reference between renders and
// does not loop. Invalidated on every write.
let snapshot = null

const buildSnapshot = () => {
    const now = Date.now()
    return readRaw()
        .filter(
            (a) =>
                a &&
                a.id &&
                isUsableToken(a.accessToken) &&
                isUsableToken(a.refreshToken) &&
                now - (a.lastUsedAt || now) < MAX_AGE_MS,
        )
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
}

export const readAccounts = () => {
    if (!snapshot) snapshot = buildSnapshot()
    return snapshot
}

const invalidate = () => {
    snapshot = null
    emit()
}

export const getAccount = (id) => readAccounts().find((a) => a.id === id) || null

export const getActiveId = () => localStorage.getItem(ACTIVE_KEY)

export const setActiveId = (id) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
}

/**
 * Record a session. Tokens must come from the same response as the user.
 */
export const upsertAccount = ({ user, accessToken, refreshToken }) => {
    if (!user || !user._id) return
    if (!isUsableToken(accessToken) || !isUsableToken(refreshToken)) return

    const existing = readRaw().filter((a) => a && a.id)
    const idx = existing.findIndex((a) => a.id === user._id)
    const entry = {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || '',
        role: user.role,
        accessToken,
        refreshToken,
        lastUsedAt: Date.now(),
    }

    if (idx >= 0) existing[idx] = entry
    else existing.push(entry)

    const trimmed = existing
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .slice(0, MAX_ACCOUNTS)

    writeRaw(trimmed)
    invalidate()
}

/**
 * Replace the stored tokens for one account after a rotation. Called from the
 * axios interceptor, which is why this module cannot be a hook.
 */
export const updateTokens = (userId, { accessToken, refreshToken }) => {
    if (!userId) return
    if (!isUsableToken(accessToken) || !isUsableToken(refreshToken)) return

    const existing = readRaw()
    const idx = existing.findIndex((a) => a && a.id === userId)
    if (idx < 0) return

    existing[idx] = { ...existing[idx], accessToken, refreshToken, lastUsedAt: Date.now() }
    writeRaw(existing)
    invalidate()
}

export const removeAccount = (id) => {
    if (!id) return
    writeRaw(readRaw().filter((a) => a && a.id !== id))
    invalidate()
}

// ── Live session ────────────────────────────────────────────────────────────

export const setSession = ({ accessToken, refreshToken }) => {
    if (isUsableToken(accessToken)) localStorage.setItem(ACCESS_KEY, accessToken)
    if (isUsableToken(refreshToken)) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export const getAccessToken = () => {
    const t = localStorage.getItem(ACCESS_KEY)
    return isUsableToken(t) ? t : null
}

export const getRefreshToken = () => {
    const t = localStorage.getItem(REFRESH_KEY)
    return isUsableToken(t) ? t : null
}

export const clearSession = () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    setActiveId(null)
    clearSwitch()
}

// ── Cached user profile ─────────────────────────────────────────────────────

export const readCachedUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY))
    } catch {
        return null
    }
}

export const writeCachedUser = (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
}

// ── Switch handshake ────────────────────────────────────────────────────────
//
// switchAccount installs another account's tokens and reloads. Across that
// reload the cached pn_user still describes the OLD account, so anything that
// trusts it would be pairing the wrong identity with the new tokens. This flag
// tells the boot path to distrust the cache until /users/me confirms who the
// tokens actually belong to.

export const beginSwitch = (id) => {
    if (id) localStorage.setItem(SWITCH_KEY, id)
}

export const getPendingSwitch = () => localStorage.getItem(SWITCH_KEY)

export const clearSwitch = () => localStorage.removeItem(SWITCH_KEY)
