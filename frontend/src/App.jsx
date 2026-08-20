import { useState } from 'react'
import { Avatar, Menu, MenuItem } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { auth } from './api'
import { useAuth } from './auth'
import Landing from './features/landing/Landing'
import { Login, Register } from './features/auth/Auth'
import Dashboard from './features/dashboard/Dashboard'
import WorldDetail from './features/world/WorldDetail'
import Logo from './shared/components/Logo/Logo'
import styles from './App.module.css'

function PrivateRoute({ children }) {
  const location = useLocation()
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [anchor, setAnchor] = useState(null)

  return (
    <div className={styles.appRoot}>
      <header className={styles.appBar}>
        <div className={styles.toolbar}>
          <Logo onClick={() => navigate('/app')} />
          <div className={styles.userMenu}>
            <button className={styles.avatarBtn} onClick={(e) => setAnchor(e.currentTarget)}>
              <Avatar className={styles.headerAvatar}>
                {(user?.username || '?')[0].toUpperCase()}
              </Avatar>
            </button>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem disabled>
                <span className={styles.usernameLabel}>@{user?.username}</span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null)
                  logout()
                  navigate('/')
                }}
              >
                <span className={styles.logoutItem}>
                  <LogoutIcon fontSize="small" />
                  Вийти
                </span>
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const start = () => {
    if (auth.isAuthenticated()) navigate('/app')
    else navigate('/register')
  }
  const back = () => navigate('/app')

  return (
    <Routes>
      <Route path="/" element={<Landing onStart={start} />} />
      <Route path="/login" element={<Login onNavigate={navigate} />} />
      <Route path="/register" element={<Register onNavigate={navigate} />} />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="worlds/:worldId" element={<WorldDetail onBack={back} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
