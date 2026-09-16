import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import UserAvatar from '../UserAvatar/UserAvatar'
import { stockCoverFor } from '../../stockImages'
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
export default function WorldCard({ world, index = 0, tone = 'auto', ctaLabel = null, onCta = null }) {
  const navigate = useNavigate()
  const percent = getCompletionPercent(world)
  const resolved = tone === 'auto' ? TONES[index % 5] : tone
  const coverSrc = world.cover_image_url || stockCoverFor(world.id)
  // Опційний CTA всередині картки (span, а не вкладений button:
  // корінь картки вже є кнопкою). Використовується тільки там,
  // де передано ctaLabel + onCta; решта місць без змін.
  const showCta = Boolean(ctaLabel && onCta)
  const handleCta = (e) => {
    e.stopPropagation()
    onCta()
  }

  return (
    <Button
      className={`${styles.worldCard} ${styles[`card${cap(resolved)}`]}`}
      onClick={() => navigate(`/app/worlds/${world.id}`)}
      sx={{ '& .MuiTouchRipple-ripple': { color: 'rgba(0, 0, 0, 0.18)' } }}
    >
      {coverSrc && (
        <div className={styles.cardCoverWrap} aria-hidden="true">
          <img src={coverSrc} alt="" className={styles.cardCover} loading="lazy" decoding="async" />
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
      {showCta && (
        <>
          <div className={styles.cardDivider} aria-hidden="true" />
          <span
            className={styles.cardCta}
            role="button"
            tabIndex={0}
            onClick={handleCta}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onCta()
              }
            }}
          >
            {ctaLabel}
            <ArrowForwardIcon fontSize="small" />
          </span>
        </>
      )}
    </Button>
  )
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
