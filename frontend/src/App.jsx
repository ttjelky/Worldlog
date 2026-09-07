import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LinearProgress } from '@mui/material'
import { auth } from './api'
import { useAuth } from './auth'
import UndoProvider from './shared/undo/UndoProvider'
import FeedbackProvider from './shared/feedback/FeedbackProvider'
import { NotificationProvider } from './shared/notifications/NotificationProvider'
import ToastNotification from './shared/notifications/ToastNotification'
import ScrollToTop from './shared/components/ScrollToTop/ScrollToTop'

// Код-спліт за роутами: кожна сторінка вантажиться окремим чанком
const Landing = lazy(() => import('./features/landing/Landing'))
const Auth = lazy(() => import('./features/auth/Auth').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./features/auth/Auth').then((m) => ({ default: m.Register })))
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
const MyWorlds = lazy(() => import('./features/myworlds/MyWorlds'))
const WorldDetail = lazy(() => import('./features/world/WorldDetail'))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'))
const NotFoundPage = lazy(() => import('./features/notfound/NotFoundPage'))
const FriendsPage = lazy(() => import('./features/friends/FriendsPage'))
const SearchPage = lazy(() => import('./features/search/SearchPage'))
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'))

function RouteFallback() {
  return <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }} />
}

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
  return (
    <NotificationProvider>
      <UndoProvider>
        <FeedbackProvider>
          <ToastNotification />
          <Outlet />
        </FeedbackProvider>
      </UndoProvider>
    </NotificationProvider>
  )
}

export default function App() {
  const navigate = useNavigate()
  const start = () => {
    if (auth.isAuthenticated()) navigate('/app')
    else navigate('/register')
  }
  const back = () => navigate('/app')

  return <AppRoutes start={start} back={back} />
}

function AppRoutes({ start, back }) {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing onStart={start} />} />
        <Route path="/login" element={<Auth />} />
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
          <Route path="friends" element={<FriendsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:username" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </>
  )
}
