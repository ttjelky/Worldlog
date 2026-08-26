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

function getTokenPayload(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = getTokenPayload(token)
  if (!payload || !payload.exp) return true
  return payload.exp * 1000 < Date.now()
}

function isAuthenticated() {
  const token = getAccess()
  if (!token) return false
  if (!isTokenExpired(token)) return true
  const refresh = getRefresh()
  if (!refresh) return false
  return !isTokenExpired(refresh)
}

let refreshPromise = null

async function refreshTokens() {
  if (refreshPromise) return refreshPromise

  const refresh = getRefresh()
  if (!refresh) throw new Error('No refresh token')

  refreshPromise = axios
    .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
    .then((res) => {
      setAuth(res.data.access, res.data.refresh)
      return res.data.access
    })
    .catch((err) => {
      clearAuth()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

api.interceptors.request.use(async (config) => {
  if (config.url.includes('/auth/token')) {
    return config
  }

  let token = getAccess()
  const refresh = getRefresh()

  if (token && refresh && isTokenExpired(token)) {
    try {
      token = await refreshTokens()
    } catch {
      // refresh failed — response interceptor will handle 401
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry || original.url.includes('/auth/token')) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      const newAccess = await refreshTokens()
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  },
)

export const auth = { getAccess, getRefresh, setAuth, clearAuth, isAuthenticated }
export default api
