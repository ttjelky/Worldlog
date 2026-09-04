import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { auth } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      auth.clearAuth()
      setHydrating(false)
      return
    }
    api
      .get('/me/')
      .then((res) => {
        setUser({
          id: res.data.id,
          username: res.data.username,
          email: res.data.email,
          display_name: res.data.display_name || '',
          bio: res.data.bio || '',
          avatar_url: res.data.avatar_url || null,
          date_joined: res.data.date_joined,
          worlds_count: res.data.worlds_count || 0,
          friends_count: res.data.friends_count || 0,
        })
      })
      .catch(() => {
        auth.clearAuth()
      })
      .finally(() => setHydrating(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/token/', { email, password })
    auth.setAuth(res.data.access, res.data.refresh)
    const me = await api.get('/me/')
    setUser({
      id: me.data.id,
      username: me.data.username,
      email: me.data.email,
      display_name: me.data.display_name || '',
      bio: me.data.bio || '',
      avatar_url: me.data.avatar_url || null,
      date_joined: me.data.date_joined,
      worlds_count: me.data.worlds_count || 0,
      friends_count: me.data.friends_count || 0,
    })
    return me.data
  }, [])

  const register = useCallback(
    async (username, email, password) => {
      await api.post('/auth/register/', { username, email, password })
      return login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    const refresh = auth.getRefresh()
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh })
      }
    } catch {
      // best-effort — clear local state even if backend call fails
    }
    auth.clearAuth()
    setUser(null)
  }, [])

  const updateUser = useCallback((newData) => {
    setUser((prev) => (prev ? { ...prev, ...newData } : null))
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout, hydrating, updateUser }),
    [user, login, register, logout, hydrating, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
