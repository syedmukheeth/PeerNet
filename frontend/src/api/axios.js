import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// On 401 → try refresh → retry
let isRefreshing = false
let queue = []

api.interceptors.response.use(
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
                        return api(original)
                    })
                    .catch(Promise.reject.bind(Promise))
            }
            original._retry = true
            isRefreshing = true
            try {
                const rt = localStorage.getItem('refreshToken')
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rt })
                const { accessToken, refreshToken } = data.data
                localStorage.setItem('accessToken', accessToken)
                localStorage.setItem('refreshToken', refreshToken)
                queue.forEach((p) => p.resolve(accessToken))
                queue = []
                original.headers.Authorization = `Bearer ${accessToken}`
                return api(original)
            } catch {
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
    },
)

export default api
