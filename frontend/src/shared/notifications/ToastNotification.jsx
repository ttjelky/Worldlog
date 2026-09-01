import UserAvatar from '../components/UserAvatar/UserAvatar'
import { useNotifications } from './NotificationProvider'
import styles from './ToastNotification.module.css'

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
      aria-label={`${notification.message}. Натисніть, щоб перейти до запитів.`}
    >
      <div className={styles.iconWrap}>
        <UserAvatar
          username={notification.from_user_username}
          size="sm"
        />
      </div>
      <div className={styles.content}>
        <p className={styles.title}>Новий запит у друзі</p>
        <p className={styles.message}>{fromName} хоче додати вас у друзі</p>
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
