import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Snackbar, Button } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import PublicIcon from '@mui/icons-material/Public'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import UserAvatar from '../../shared/components/UserAvatar/UserAvatar'
import styles from './NotificationsPage.module.css'

const TYPE_META = {
  friend_request: { label: 'Запит у друзі' },
  friend_accepted: { label: 'Друзі' },
  world_access_request: { label: 'Запит доступу до світу' },
  world_access_accepted: { label: 'Доступ надано' },
  world_access_rejected: { label: 'Доступ відхилено' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activePage, setActivePage] = useState('notifications')
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
      setSnackbar({ open: true, message: 'Усі прочитано' })
    },
  })

  const acceptAccess = useMutation({
    mutationFn: (id) => api.post(`/world-access-requests/${id}/accept/`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
      setSnackbar({ open: true, message: 'Запит прийнято' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Помилка' })
    },
  })

  const rejectAccess = useMutation({
    mutationFn: (id) => api.post(`/world-access-requests/${id}/reject/`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
      setSnackbar({ open: true, message: 'Запит відхилено' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Помилка' })
    },
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleClick = (notification) => {
    markRead.mutate(notification.id)
    if (notification.notification_type === 'friend_request' || notification.notification_type === 'friend_accepted') {
      navigate('/app/friends?tab=requests')
    } else if (notification.notification_type.startsWith('world_access')) {
      navigate('/app/worlds')
    }
  }

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        logoSrc="/worldlog-logo-white.png"
        onNavigate={(id) => {
          if (id === 'home') navigate('/app')
          else if (id === 'worlds') navigate('/app/worlds')
          else if (id === 'friends') navigate('/app/friends')
          else if (id === 'search') navigate('/app/search')
          else if (id === 'notifications') navigate('/app/notifications')
        }}
      />

      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroRow}>
            <div>
              <p className={styles.heroGreeting}>Сповіщення</p>
              <h1 className={styles.heroTitle}>Сповіщення</h1>
            </div>
            {unreadCount > 0 && (
              <Button
                className={styles.markAllBtn}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Прочитати все ({unreadCount})
              </Button>
            )}
          </div>
        </section>

        {isLoading && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Завантаження...</p>
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className={styles.emptyState}>
            <PublicIcon className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Немає сповіщень</h3>
            <p className={styles.emptyText}>Тут з'являться ваші сповіщення</p>
          </div>
        )}

        {notifications.length > 0 && (
          <div className={styles.list}>
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={handleClick}
                onAcceptAccess={(id) => acceptAccess.mutate(id)}
                onRejectAccess={(id) => rejectAccess.mutate(id)}
                loading={acceptAccess.isPending || rejectAccess.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          content: {
            sx: {
              background: '#2d2d2d',
              color: '#ffffff',
              borderRadius: '22px',
              fontWeight: 500,
              fontSize: 15,
              boxShadow: '0 8px 28px rgba(13, 13, 15, 0.35)',
            },
          },
        }}
      />
    </div>
  )
}

function NotificationItem({ notification, onClick, onAcceptAccess, onRejectAccess, loading }) {
  const isPendingAccess = notification.notification_type === 'world_access_request' && !notification.is_read

  return (
    <div
      className={`${styles.item} ${!notification.is_read ? styles.unread : ''}`}
      onClick={() => isPendingAccess ? null : onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isPendingAccess) onClick(notification)
        }
      }}
    >
      <div className={styles.itemIcon}>
        <UserAvatar
          username={notification.from_user_username || ''}
          avatarUrl={notification.from_user_avatar_url}
          size="sm"
        />
      </div>
      <div className={styles.itemContent}>
        <span className={styles.itemLabel}>{meta.label}</span>
        <span className={styles.itemMessage}>{notification.message}</span>
        <span className={styles.itemTime}>{formatTime(notification.created_at)}</span>
      </div>
      {isPendingAccess && (
        <div className={styles.itemActions}>
          <Button
            className={styles.acceptBtn}
            onClick={(e) => {
              e.stopPropagation()
              onAcceptAccess(notification.id)
            }}
            disabled={loading}
            startIcon={<CheckIcon />}
          >
            Прийняти
          </Button>
          <Button
            className={styles.rejectBtn}
            onClick={(e) => {
              e.stopPropagation()
              onRejectAccess(notification.id)
            }}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Відхилити
          </Button>
        </div>
      )}
    </div>
  )
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'щойно'
  if (diffMin < 60) return `${diffMin} хв тому`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} год тому`
  const diffD = Math.floor(diffH / 24)
  return `${diffD} дн тому`
}
