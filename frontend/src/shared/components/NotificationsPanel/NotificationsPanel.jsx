import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import api from '../../../api'
import UserAvatar from '../UserAvatar/UserAvatar'
import styles from './NotificationsPanel.module.css'

const TYPE_META = {
  friend_request: { label: 'Запит у друзі' },
  friend_accepted: { label: 'Друзі' },
  world_access_request: { label: 'Запит доступу до світу' },
  world_access_accepted: { label: 'Доступ надано' },
  world_access_rejected: { label: 'Доступ відхилено' },
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'щойно'
  if (min < 60) return `${min} хв тому`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} год тому`
  return d.toLocaleDateString('uk-UA')
}

export default function NotificationsPanel({ onClose }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

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
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const reviewAccess = (id, action) =>
    api.post(`/world-access-requests/${id}/${action}/`).then(() => {
      qc.invalidateQueries(['notifications'])
      qc.invalidateQueries(['access-requests'])
      qc.invalidateQueries(['memberships'])
    })
  const acceptAccess = useMutation({ mutationFn: (id) => reviewAccess(id, 'accept') })
  const rejectAccess = useMutation({ mutationFn: (id) => reviewAccess(id, 'reject') })
  const reviewBusy = acceptAccess.isPending || rejectAccess.isPending

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const openItem = (n) => {
    markRead.mutate(n.id)
    onClose()
    if (n.notification_type === 'friend_request' || n.notification_type === 'friend_accepted') {
      navigate('/app/friends?tab=requests')
    } else if (n.notification_type.startsWith('world_access')) {
      navigate('/app/worlds')
    }
  }

  const actAccess = (n, action) => {
    const fn = action === 'accept' ? acceptAccess.mutate : rejectAccess.mutate
    fn(n.access_request, { onSuccess: () => markRead.mutate(n.id) })
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-label="Сповіщення"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            Сповіщення
            {unreadCount > 0 && <span className={styles.count}>{unreadCount}</span>}
          </h2>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.readAllBtn}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Прочитати все
              </button>
            )}
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {isLoading && <p className={styles.hint}>Завантаження…</p>}

          {!isLoading && notifications.length === 0 && (
            <div className={styles.empty}>
              <NotificationsNoneIcon className={styles.emptyIcon} />
              <p className={styles.emptyText}>Немає сповіщень</p>
            </div>
          )}

          {notifications.map((n) => {
            const meta = TYPE_META[n.notification_type] || { label: 'Сповіщення' }
            const canReview =
              n.notification_type === 'world_access_request' &&
              !n.is_read &&
              n.access_request != null
            return (
              <div
                key={n.id}
                className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                onClick={() => {
                  if (!canReview) openItem(n)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !canReview) {
                    e.preventDefault()
                    openItem(n)
                  }
                }}
              >
                <UserAvatar
                  username={n.from_user_username || ''}
                  avatarUrl={n.from_user_avatar_url}
                  size="sm"
                />
                <div className={styles.itemContent}>
                  <span className={styles.itemLabel}>{meta.label}</span>
                  <span className={styles.itemMessage}>{n.message}</span>
                  <span className={styles.itemTime}>{formatTime(n.created_at)}</span>
                </div>
                {canReview && (
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => actAccess(n, 'accept')}
                      disabled={reviewBusy}
                      aria-label="Прийняти"
                    >
                      <CheckIcon fontSize="small" />
                    </button>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      onClick={() => actAccess(n, 'reject')}
                      disabled={reviewBusy}
                      aria-label="Відхилити"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
