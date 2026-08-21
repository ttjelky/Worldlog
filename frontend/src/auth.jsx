import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { auth } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      setHydrating(false)
      return
    }
    api
      .get('/me/')
      .then((res) => {
        setUser({ username: res.data.username, email: res.data.email, id: res.data.id })
      })
      .catch(() => {
        auth.clearAuth()
      })
      .finally(() => setHydrating(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/token/', { username, password })
    auth.setAuth(res.data.access, res.data.refresh)
    const me = await api.get('/me/')
    setUser({ username: me.data.username, email: me.data.email, id: me.data.id })
    return me.data
  }, [])

  const register = useCallback(
    async (username, email, password) => {
      await api.post('/auth/register/', { username, email, password })
      return login(username, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    auth.clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout, hydrating }),
    [user, login, register, logout, hydrating],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
