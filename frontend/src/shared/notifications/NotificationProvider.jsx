import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../auth'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [toasts, setToasts] = useState([])
  const seenIdsRef = useRef(new Set())
  const prevUnreadRef = useRef(0)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!notifications.length) return

    const newOnes = notifications.filter(
      (n) => !n.is_read && !seenIdsRef.current.has(n.id),
    )

    if (newOnes.length > 0 && prevUnreadRef.current > 0) {
      newOnes.forEach((n) => {
        seenIdsRef.current.add(n.id)
        addToast(n)
      })
    }

    prevUnreadRef.current = notifications.filter((n) => !n.is_read).length
  }, [notifications])

  const addToast = useCallback((notification) => {
    const id = `toast-${notification.id}-${Date.now()}`
    setToasts((prev) => [
      ...prev,
      {
        id,
        notification,
        visible: true,
      },
    ])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
  }, [])

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        await api.post(`/notifications/${notificationId}/read/`)
        qc.invalidateQueries(['notifications'])
      } catch {
        // best-effort
      }
    },
    [qc],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all/')
      qc.invalidateQueries(['notifications'])
    } catch {
      // best-effort
    }
  }, [qc])

  const navigateToRequest = useCallback(
    (notification) => {
      markAsRead(notification.id)
      if (notification.notification_type === 'friend_request' || notification.notification_type === 'friend_accepted') {
        navigate('/app/friends?tab=requests')
      } else if (notification.notification_type.startsWith('world_access')) {
        navigate('/app/notifications')
      } else {
        navigate('/app/notifications')
      }
    },
    [navigate, markAsRead],
  )

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const value = {
    toasts,
    dismissToast,
    navigateToRequest,
    markAsRead,
    markAllAsRead,
    unreadCount,
    notifications,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
