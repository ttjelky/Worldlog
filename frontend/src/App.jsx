import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { auth } from './api'
import { useAuth } from './auth'
import Landing from './pages/Landing'
import { Login, Register } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import WorldDetail from './pages/world/WorldDetail'
import Logo from './components/Logo'

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
    <Box minHeight="100vh" bgcolor="#F9F9FC">
      <AppBar position="sticky" sx={{ bgcolor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Logo onClick={() => navigate('/app')} />
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {(user?.username || '?')[0].toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">@{user?.username}</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchor(null)
                    logout()
                    navigate('/')
                  }}
                >
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Вийти
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
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