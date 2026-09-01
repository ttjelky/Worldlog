import { Button, CircularProgress } from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import PeopleIcon from '@mui/icons-material/People'
import { useAuth } from '../../../auth'
import styles from './FriendActionButton.module.css'

export default function FriendActionButton({ isOwnProfile, friendship, actions }) {
  const { user: currentUser } = useAuth()

  if (isOwnProfile) {
    return (
      <Button
        className={`${styles.btn} ${styles.btnEdit}`}
        startIcon={<PersonAddIcon />}
      >
        Редагувати профіль
      </Button>
    )
  }

  if (actions.loading) {
    return (
      <Button className={`${styles.btn} ${styles.btnLoading}`} disabled>
        <CircularProgress size={18} className={styles.spinner} />
      </Button>
    )
  }

  if (!friendship) {
    return (
      <Button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={actions.onSend}
        startIcon={<PersonAddIcon />}
      >
        Додати в друзі
      </Button>
    )
  }

  const { status, user_a } = friendship
  const isSender = user_a === currentUser?.id

  if (status === 'pending') {
    if (isSender) {
      return (
        <Button
          className={`${styles.btn} ${styles.btnOutlined}`}
          onClick={actions.onCancel}
          startIcon={<CloseIcon />}
        >
          Скасувати запит
        </Button>
      )
    }
    return (
      <div className={styles.pendingActions}>
        <Button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={actions.onAccept}
          startIcon={<CheckIcon />}
        >
          Прийняти
        </Button>
        <Button
          className={`${styles.btn} ${styles.btnOutlined}`}
          onClick={actions.onReject}
          startIcon={<CloseIcon />}
        >
          Відхилити
        </Button>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className={styles.friendActions}>
        <Button
          className={`${styles.btn} ${styles.btnChip}`}
          startIcon={<PeopleIcon />}
        >
          Ви друзі
        </Button>
        <Button
          className={`${styles.btn} ${styles.btnRemove}`}
          onClick={actions.onRemove}
        >
          Видалити з друзів
        </Button>
      </div>
    )
  }

  return null
}
