import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

const TOKEN_KEY = 'wl_access'
const REFRESH_KEY = 'wl_refresh'

function getAccess() {
  return localStorage.getItem(TOKEN_KEY)
}

function getRefresh() {
  return localStorage.getItem(REFRESH_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const refresh = getRefresh()
    if (
      error.response?.status === 401 &&
      !original._retry &&
      refresh &&
      !original.url.includes('/auth/token')
    ) {
      original._retry = true
      try {
        const res = await axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
        localStorage.setItem(TOKEN_KEY, res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return api(original)
      } catch {
        clearAuth()
      }
    }
    return Promise.reject(error)
  },
)

function setAuth(access, refresh) {
  localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

function isAuthenticated() {
  return Boolean(getAccess())
}

export const auth = { getAccess, setAuth, clearAuth, isAuthenticated }
export default api
