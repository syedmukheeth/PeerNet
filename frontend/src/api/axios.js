import axios from 'axios'
import * as accountStore from '../lib/accountStore'

const rawApiUrl = import.meta.env.VITE_API_URL;

// Main API server (unified posts, messages, auth, etc.)
const MAIN_API = 'https://peernet-5u5q.onrender.com/api/v1';

const BASE_URL = rawApiUrl 
    ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`)
    : (window.location.hostname.includes('vercel.app') ? MAIN_API : '/api/v1'); 

// Chat endpoints consolidated to Main API host (unified)
export const CHAT_BASE_URL = `${BASE_URL}/conversations`;

export const SOCKET_URL = BASE_URL.split('/api/v1')[0].replace(/\/+$/, '');

// ── Shared refresh state ────────────────────────────────────────
//
// Module scope, deliberately. This used to live inside applyInterceptors, so
// `api` and `chatApi` each held their own copy. The layout syncs counts by
// calling both instances in one Promise.all, so an expired access token 401'd
// on both at once and each fired its own POST /auth/refresh with the same
// refresh token. The server rotates on first use, so the second request always
// lost the race, failed, and the error path below signed the user out mid
// session.
//
// A single in-flight promise shared by both instances means concurrent 401s
// await one refresh instead of racing.
let refreshPromise = null

const refreshSession = () => {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
        const rt = accountStore.getRefreshToken()
        // Without a stored token there is nothing to assert, and falling back to
        // the ambient cookie would refresh whichever account signed in last
        // rather than this one.
        if (!rt) throw new Error('No refresh token for the active account')

        const { data } = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refreshToken: rt },
            { withCredentials: true }
        )

        const { accessToken, refreshToken } = data.data
        accountStore.setSession({ accessToken, refreshToken })

        // Keep the stored copy in step with the rotation. The server revokes the
        // old refresh token, so an entry that is not updated here is dead the
        // next time it is used.
        accountStore.updateTokens(accountStore.getActiveId(), { accessToken, refreshToken })

        // Let useSocket re-authenticate its connection with the new token
        window.dispatchEvent(new CustomEvent('peernet:token-refreshed', { detail: { accessToken } }))

        return accessToken
    })()

    // Cleared once settled so the next expiry can start a fresh attempt.
    refreshPromise.catch(() => {}).finally(() => { refreshPromise = null })

    return refreshPromise
}

// Requests to these endpoints must never trigger a refresh. Only /auth/login
// was excluded before, so a 401 from register, google or guest, none of which
// involve an existing session, ran the refresh path and then wiped the stored
// account of a user who was never signed in.
const isAuthEndpoint = (url = '') => url.includes('/auth/')

// ── Shared Interceptor Logic ────────────────────────────────────

const applyInterceptors = (instance) => {
    instance.interceptors.request.use((config) => {
        // Reads through the store, which rejects the literal strings "undefined"
        // and "null" that used to reach the server as `Bearer undefined`.
        const token = accountStore.getAccessToken()
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
    })

    instance.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config

            if (err.response?.status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
                return Promise.reject(err)
            }

            // Set before awaiting, so a retry that 401s again falls through to
            // the rejection above instead of re-entering the refresh path.
            original._retry = true

            try {
                const accessToken = await refreshSession()
                original.headers.Authorization = `Bearer ${accessToken}`
                return instance(original)
            } catch (refreshErr) {
                console.error('[AXIOS] Refresh failed:', refreshErr.response?.status ?? refreshErr.message)
                // This session cannot be revived, so drop it from the switcher
                // instead of leaving an entry that can never be selected.
                // Also covers a guest account the cleanup job has deleted.
                const dead = accountStore.getActiveId()
                if (dead) accountStore.removeAccount(dead)
                accountStore.clearSession()
                return Promise.reject(err)
            }
        }
    )
}

// ── Instantiate Instances ───────────────────────────────────────

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
})

export const chatApi = axios.create({
    baseURL: CHAT_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
})

applyInterceptors(api)
applyInterceptors(chatApi)

export default api
