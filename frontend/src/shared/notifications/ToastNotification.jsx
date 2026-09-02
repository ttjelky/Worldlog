import UserAvatar from '../components/UserAvatar/UserAvatar'
import { useNotifications } from './NotificationProvider'
import styles from './ToastNotification.module.css'

const TYPE_LABELS = {
  friend_request: { title: 'Новий запит у друзі', text: (name) => `${name} хоче додати вас у друзі` },
  friend_accepted: { title: 'Друг прийняв запит', text: (name) => `${name} прийняв ваш запит у друзі` },
  world_access_request: { title: 'Запит доступу до світу', text: (msg) => msg },
  world_access_accepted: { title: 'Доступ надано', text: (msg) => msg },
  world_access_rejected: { title: 'Доступ відхилено', text: (msg) => msg },
}

export default function ToastNotification() {
  const { toasts, dismissToast, navigateToRequest } = useNotifications()

  if (!toasts.length) return null

  return (
    <div className={styles.container} aria-live="polite" aria-label="Сповіщення">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onClick={navigateToRequest}
        />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss, onClick }) {
  const { notification } = toast
  const fromName = notification.from_user_username || 'Користувач'
  const typeMeta = TYPE_LABELS[notification.notification_type] || TYPE_LABELS.friend_request

  const handleClick = () => {
    onClick(notification)
    onDismiss(toast.id)
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    onDismiss(toast.id)
  }

  return (
    <div
      className={styles.toast}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      aria-label={`${notification.message}. Натисніть, щоб перейти.`}
    >
      <div className={styles.iconWrap}>
        <UserAvatar
          username={notification.from_user_username}
          avatarUrl={notification.from_user_avatar_url}
          size="sm"
        />
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{typeMeta.title}</p>
        <p className={styles.message}>{typeMeta.text(fromName)}</p>
      </div>
      <button
        className={styles.closeBtn}
        onClick={handleDismiss}
        aria-label="Закрити"
        type="button"
      >
        ×
      </button>
    </div>
  )
}
