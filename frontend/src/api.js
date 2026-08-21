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

api.interceptors.request.use((config) => {
  const token = getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const refresh = getRefresh()

    if (
      error.response?.status !== 401 ||
      original._retry ||
      !refresh ||
      original.url.includes('/auth/token')
    ) {
      return Promise.reject(error)
    }

    original._retry = true

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
        .then((res) => {
          const newAccess = res.data.access
          const newRefresh = res.data.refresh
          setAuth(newAccess, newRefresh)
          return newAccess
        })
        .catch((err) => {
          clearAuth()
          window.location.href = '/login'
          return Promise.reject(err)
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    try {
      const newAccess = await refreshPromise
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  },
)

export const auth = { getAccess, setAuth, clearAuth, isAuthenticated }
export default api
