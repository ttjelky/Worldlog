import { Button } from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckIcon from '@mui/icons-material/Check'
import { useAuth } from '../../../auth'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './SearchResult.module.css'

export default function SearchResult({ user, onSendFriend, onAcceptFriend, loading, onNavigate }) {
  const { user: currentUser } = useAuth()
  const friendship = user.friendship

  const getAction = () => {
    if (!friendship) {
      return (
        <Button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onSendFriend(user.id)
          }}
          disabled={loading}
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
          <span className={styles.pendingBadge}>Запит надіслано</span>
        )
      }
      return (
        <Button
          className={`${styles.actionBtn} ${styles.acceptBtn}`}
          onClick={(e) => {
            e.stopPropagation()
            onAcceptFriend(friendship.id)
          }}
          disabled={loading}
          startIcon={<CheckIcon />}
        >
          Прийняти
        </Button>
      )
    }

    if (status === 'accepted') {
      return (
        <span className={styles.friendBadge}>Друзі</span>
      )
    }

    return null
  }

  return (
    <div
      className={styles.card}
      onClick={() => onNavigate(`/app/profile/${user.username}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate(`/app/profile/${user.username}`)
        }
      }}
    >
      <UserAvatar user={user} size="md" />
      <div className={styles.info}>
        <span className={styles.displayName}>
          {user.display_name || user.username}
        </span>
        <span className={styles.username}>@{user.username}</span>
      </div>
      <div className={styles.actionArea}>
        {getAction()}
      </div>
    </div>
  )
}
