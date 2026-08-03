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

// ── Shared Interceptor Logic ────────────────────────────────────

const applyInterceptors = (instance) => {
    instance.interceptors.request.use((config) => {
        // Reads through the store, which rejects the literal strings "undefined"
        // and "null" that used to reach the server as `Bearer undefined`.
        const token = accountStore.getAccessToken()
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
    })

    let isRefreshing = false
    let queue = []

    instance.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config
            // Do not attempt refresh on login or refresh endpoints themselves
            if (err.response?.status === 401 && !original._retry && !original.url.includes('/auth/login')) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        queue.push({ resolve, reject })
                    })
                        .then((token) => {
                            original.headers.Authorization = `Bearer ${token}`
                            return instance(original)
                        })
                        .catch(Promise.reject.bind(Promise))
                }
                original._retry = true
                isRefreshing = true
                try {
                    const rt = accountStore.getRefreshToken()
                    // Without a stored token there is nothing to assert, and
                    // falling back to the ambient cookie would refresh whichever
                    // account signed in last rather than this one.
                    if (!rt) throw err

                    const { data } = await axios.post(
                        `${BASE_URL}/auth/refresh`,
                        { refreshToken: rt },
                        { withCredentials: true }
                    )
                    const { accessToken, refreshToken } = data.data
                    accountStore.setSession({ accessToken, refreshToken })

                    // Keep the stored copy in step with the rotation. The server
                    // blacklists the old refresh token, so an entry that is not
                    // updated here is dead the next time it is used.
                    accountStore.updateTokens(accountStore.getActiveId(), { accessToken, refreshToken })

                    // Let useSocket re-authenticate its connection with the new token
                    window.dispatchEvent(new CustomEvent('peernet:token-refreshed', { detail: { accessToken } }))

                    queue.forEach((p) => p.resolve(accessToken))
                    queue = []
                    original.headers.Authorization = `Bearer ${accessToken}`
                    return instance(original)
                } catch (refreshErr) {
                    console.error('[AXIOS] Refresh Failed:', refreshErr.response?.status)
                    queue.forEach((p) => p.reject(err))
                    queue = []
                    // This session cannot be revived, so drop it from the switcher
                    // instead of leaving an entry that can never be selected.
                    // Also covers a guest account the cleanup job has deleted.
                    const dead = accountStore.getActiveId()
                    if (dead) accountStore.removeAccount(dead)
                    accountStore.clearSession()
                    return Promise.reject(err)
                } finally {
                    isRefreshing = false
                }
            }
            return Promise.reject(err)
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
