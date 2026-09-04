import { useNavigate } from 'react-router-dom'
import PersonIcon from '@mui/icons-material/Person'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './FriendsList.module.css'

export default function FriendsList({ friends, onRemove, loading }) {
  const navigate = useNavigate()

  if (friends.length === 0) {
    return (
      <div className={styles.emptyState}>
        <PersonIcon className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>Ще немає друзів</h3>
        <p className={styles.emptyText}>
          Знайдіть користувачів WORLDLOG та додайте їх у друзі.
        </p>
        <button
          className={styles.emptyCta}
          onClick={() => navigate('/app/search')}
          type="button"
        >
          Знайти користувачів
        </button>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {friends.map((f) => (
        <FriendCard
          key={f.id}
          friendship={f}
          onRemove={() => onRemove(f.id)}
          loading={loading}
          onNavigate={navigate}
        />
      ))}
    </div>
  )
}

function FriendCard({ friendship, onRemove, loading, onNavigate }) {
  const other = friendship.other_user
  if (!other) return null

  return (
    <div className={styles.card}>
      <button
        className={styles.cardMain}
        onClick={() => onNavigate(`/app/profile/${other.username}`)}
        type="button"
      >
        <UserAvatar user={other} size="md" />
        <div className={styles.cardInfo}>
          <span className={styles.displayName}>
            {other.display_name || other.username}
          </span>
          <span className={styles.username}>@{other.username}</span>
        </div>
      </button>
      <button
        className={styles.removeBtn}
        onClick={onRemove}
        disabled={loading}
        aria-label={`Видалити ${other.username} з друзів`}
        type="button"
      >
        Видалити
      </button>
    </div>
  )
}
