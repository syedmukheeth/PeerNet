import axios from 'axios'

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,         // send cookies (refresh token)
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
                const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
                const token = data.data.accessToken
                localStorage.setItem('accessToken', token)
                queue.forEach((p) => p.resolve(token))
                queue = []
                original.headers.Authorization = `Bearer ${token}`
                return api(original)
            } catch {
                queue.forEach((p) => p.reject(err))
                queue = []
                localStorage.removeItem('accessToken')
                window.location.href = '/login'
                return Promise.reject(err)
            } finally {
                isRefreshing = false
            }
        }
        return Promise.reject(err)
    },
)

export default api
