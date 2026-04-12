import axios from 'axios'

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawChatApiUrl = import.meta.env.VITE_CHAT_API_URL;

// Main API server (posts, feed, auth, etc.)
const MAIN_API = 'https://peernet-5u5q.onrender.com/api/v1';

const BASE_URL = rawApiUrl 
    ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`)
    : (window.location.hostname.includes('vercel.app') ? MAIN_API : '/api/v1'); 

// Chat / Socket server is peernet-5mtc — kept separate
export const CHAT_BASE_URL = rawChatApiUrl 
    ? (rawChatApiUrl.endsWith('/api/v1') ? rawChatApiUrl : `${rawChatApiUrl.replace(/\/+$/, '')}/api/v1`)
    : (window.location.hostname.includes('vercel.app') ? 'https://peernet-5mtc.onrender.com/api/v1' : 'http://localhost:3001/api/v1');


export const SOCKET_URL = import.meta.env.VITE_CHAT_API_URL
    ? import.meta.env.VITE_CHAT_API_URL.replace(/\/api\/v1\/?$/, '')
    : (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('peernet')
        ? 'https://peernet-5mtc.onrender.com'
        : 'http://localhost:3001')

// ── Shared Interceptor Logic ────────────────────────────────────

const applyInterceptors = (instance) => {
    instance.interceptors.request.use((config) => {
        const token = localStorage.getItem('accessToken')
        if (token) config.headers.Authorization = `Bearer ${token}`
        console.log(`[AXIOS] Outgoing (${instance.defaults.baseURL}) ->`, config.url)
        return config
    })

    let isRefreshing = false
    let queue = []

    instance.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config
            if (err.response?.status === 401 && !original._retry) {
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
                    const rt = localStorage.getItem('refreshToken')
                    const { data } = await axios.post(
                        `${BASE_URL}/auth/refresh`,
                        rt ? { refreshToken: rt } : {},
                        { withCredentials: true }
                    )
                    const { accessToken, refreshToken } = data.data
                    localStorage.setItem('accessToken', accessToken)
                    localStorage.setItem('refreshToken', refreshToken)

                    // Nuclear Fix: Notify other hooks (like useSocket) that the token has changed
                    window.dispatchEvent(new CustomEvent('peernet:token-refreshed', { detail: { accessToken } }))

                    queue.forEach((p) => p.resolve(accessToken))
                    queue = []
                    original.headers.Authorization = `Bearer ${accessToken}`
                    return instance(original)
                } catch (refreshErr) {
                    console.error('[AXIOS] Refresh Failed:', refreshErr.response?.status)
                    queue.forEach((p) => p.reject(err))
                    queue = []
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
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
