import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../UserAvatar/UserAvatar'
import styles from './WorldCard.module.css'

export function getCompletionPercent(world) {
  if (!world.todos_count) return 0
  return Math.round((world.todos_done / world.todos_count) * 100)
}

const TONES = ['coral', 'teal', 'violet', 'sand', 'cactus']

/**
 * Картка світу для списків (дашборд, мої світи).
 * tone: 'coral' | 'teal' | 'violet' | 'sand' | 'cactus' | 'auto' (чергування).
 */
export default function WorldCard({ world, index = 0, tone = 'auto' }) {
  const navigate = useNavigate()
  const percent = getCompletionPercent(world)
  const resolved = tone === 'auto' ? TONES[index % TONES.length] : tone

  return (
    <Button
      className={`${styles.worldCard} ${styles[`card${cap(resolved)}`]}`}
      onClick={() => navigate(`/app/worlds/${world.id}`)}
      sx={{ '& .MuiTouchRipple-ripple': { color: 'rgba(0, 0, 0, 0.18)' } }}
    >
      {world.cover_image_url && (
        <div className={styles.cardCoverWrap} aria-hidden="true">
          <img src={world.cover_image_url} alt="" className={styles.cardCover} />
        </div>
      )}
      <div className={styles.cardTop}>
        <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.cardBadge}>{world.is_public ? 'Публічний' : 'Приватний'}</span>
      </div>
      <h3 className={styles.cardTitle}>{world.name}</h3>
      <div className={styles.cardFooter}>
        <div className={styles.cardOwner}>
          <UserAvatar
            username={world.owner_username}
            avatarUrl={world.owner_avatar_url}
            size="xs"
            className={styles.ownerAvatarWrap}
          />
          <span className={styles.ownerName}>{world.owner_username}</span>
        </div>
        <div className={styles.cardProgressTrack}>
          <div className={styles.cardProgressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </Button>
  )
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
