import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { auth } from './api'
import { useAuth } from './auth'
import Landing from './features/landing/Landing'
import { Login, Register } from './features/auth/Auth'
import Dashboard from './features/dashboard/Dashboard'
import MyWorlds from './features/myworlds/MyWorlds'
import WorldDetail from './features/world/WorldDetail'

function PrivateRoute({ children }) {
  const location = useLocation()
  const { hydrating } = useAuth()

  if (hydrating) return null
  if (!auth.isAuthenticated()) {
    return <Navigate to="/" state={{ from: location }} replace />
  }
  return children
}

function AppLayout() {
  return <Outlet />
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="worlds" element={<MyWorlds />} />
        <Route path="worlds/:worldId" element={<WorldDetail onBack={back} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
