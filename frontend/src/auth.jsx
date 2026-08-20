import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import api, { auth } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/token/', { username, password })
    auth.setAuth(res.data.access, res.data.refresh)
    const me = await api.get('/me/')
    setUser({ username: me.data.username, email: me.data.email, id: me.data.id })
    return me.data
  }, [])

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register/', { username, email, password })
    return login(username, password)
  }, [login])

  const logout = useCallback(() => {
    auth.clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, setUser, login, register, logout }),
    [user, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}