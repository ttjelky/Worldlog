import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './FriendRequestsList.module.css'

export default function FriendRequestsList({ received, sent, onAccept, onReject, loading }) {
  const navigate = useNavigate()

  if (received.length === 0 && sent.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MailOutlineIcon className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>Немає запитів</h3>
        <p className={styles.emptyText}>
          Вхідні та вихідні запити в друзі з'являться тут.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {received.length > 0 && (
        <section className={styles.section} aria-labelledby="received-heading">
          <h3 id="received-heading" className={styles.sectionTitle}>
            Вхідні запити
            <span className={styles.sectionCount}>{received.length}</span>
          </h3>
          <div className={styles.list}>
            {received.map((f) => (
              <RequestCard
                key={f.id}
                friendship={f}
                type="received"
                onAccept={() => onAccept(f.id)}
                onReject={() => onReject(f.id)}
                loading={loading}
                onNavigate={navigate}
              />
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className={styles.section} aria-labelledby="sent-heading">
          <h3 id="sent-heading" className={styles.sectionTitle}>
            Вихідні запити
            <span className={styles.sectionCount}>{sent.length}</span>
          </h3>
          <div className={styles.list}>
            {sent.map((f) => (
              <RequestCard
                key={f.id}
                friendship={f}
                type="sent"
                onNavigate={navigate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function RequestCard({ friendship, type, onAccept, onReject, loading, onNavigate }) {
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
          <span className={styles.requestText}>
            {type === 'received' ? 'Хоче додати вас у друзі' : 'Очікує на підтвердження'}
          </span>
        </div>
      </button>

      {type === 'received' && (
        <div className={styles.actions}>
          <Button
            className={styles.acceptBtn}
            onClick={onAccept}
            disabled={loading}
            startIcon={<CheckIcon />}
          >
            Прийняти
          </Button>
          <Button
            className={styles.rejectBtn}
            onClick={onReject}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Відхилити
          </Button>
        </div>
      )}

      {type === 'sent' && (
        <span className={styles.pendingBadge}>Очікує</span>
      )}
    </div>
  )
}
