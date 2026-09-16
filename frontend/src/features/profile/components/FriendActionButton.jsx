import { Button, CircularProgress } from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import PeopleIcon from '@mui/icons-material/People'
import BlockIcon from '@mui/icons-material/Block'
import { useAuth } from '../../../auth'
import styles from './FriendActionButton.module.css'

function ActionButton({ busy, disabled, onClick, className, startIcon, children, label }) {
  return (
    <Button
      className={`${styles.btn} ${className}`}
      onClick={onClick}
      disabled={disabled || busy}
      startIcon={busy ? <CircularProgress size={16} /> : startIcon}
      aria-label={label}
    >
      {children}
    </Button>
  )
}

export default function FriendActionButton({ friendship, actions }) {
  const { user: currentUser } = useAuth()
  const pending = actions.pending || null
  const anyBusy = pending != null

  if (!friendship) {
    if (pending === 'send') {
      return (
        <Button className={`${styles.btn} ${styles.btnPrimary}`} disabled>
          <CircularProgress size={18} className={styles.spinner} />
        </Button>
      )
    }
    return (
      <ActionButton
        className={styles.btnPrimary}
        onClick={actions.onSend}
        startIcon={<PersonAddIcon />}
        label="Додати в друзі"
      >
        Додати в друзі
      </ActionButton>
    )
  }

  const { status } = friendship
  // Напрямок заявки — поле sender; user_a — лише fallback для старих рядків.
  const senderId = friendship.sender ?? friendship.user_a
  const isSender = senderId != null && senderId === currentUser?.id

  if (status === 'pending') {
    if (isSender) {
      return (
        <ActionButton
          className={styles.btnOutlined}
          onClick={actions.onCancel}
          busy={pending === 'cancel'}
          disabled={anyBusy}
          startIcon={<CloseIcon />}
          label="Скасувати запит"
        >
          Скасувати запит
        </ActionButton>
      )
    }
    return (
      <div className={styles.pendingActions}>
        <ActionButton
          className={styles.btnPrimary}
          onClick={actions.onAccept}
          busy={pending === 'accept'}
          disabled={anyBusy}
          startIcon={<CheckIcon />}
          label="Прийняти запит"
        >
          Прийняти
        </ActionButton>
        <ActionButton
          className={styles.btnOutlined}
          onClick={actions.onReject}
          busy={pending === 'reject'}
          disabled={anyBusy}
          startIcon={<CloseIcon />}
          label="Відхилити запит"
        >
          Відхилити
        </ActionButton>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className={styles.friendActions}>
        <span className={`${styles.btn} ${styles.btnChip}`} aria-label="Ви у друзях">
          <PeopleIcon fontSize="small" />
          Ви друзі
        </span>
        <ActionButton
          className={styles.btnRemove}
          onClick={actions.onRemove}
          busy={pending === 'remove'}
          disabled={anyBusy}
          label="Видалити з друзів"
        >
          Видалити з друзів
        </ActionButton>
      </div>
    )
  }

  if (status === 'blocked') {
    return (
      <span className={`${styles.btn} ${styles.btnChip}`} aria-label="Доступ обмежено">
        <BlockIcon fontSize="small" />
        Доступ обмежено
      </span>
    )
  }

  return null
}
