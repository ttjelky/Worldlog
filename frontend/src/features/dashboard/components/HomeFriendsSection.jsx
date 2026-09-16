import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import api from '../../../api'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './HomeSections.module.css'

const PREVIEW_LIMIT = 6

/**
 * «Мої друзі»: компактний preview прийнятих друзів
 * (той самий ['friends'], що й FriendsPage). Без друзів секція
 * не рендериться взагалі. Клік — на існуючий профіль друга.
 */
export function HomeFriendsSection() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends/').then((r) => r.data),
    staleTime: 30000,
    retry: 1,
  })

  const friends = (Array.isArray(data) ? data : [])
    .filter((f) => f.status === 'accepted' && f.other_user)
  if (friends.length === 0) return null
  const preview = friends.slice(0, PREVIEW_LIMIT)

  return (
    <section className={styles.section} aria-label="Мої друзі">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Мої друзі</h2>
        <button
          type="button"
          className={styles.sectionLink}
          onClick={() => navigate('/app/friends')}
        >
          Усі друзі
          <ArrowForwardIcon fontSize="small" />
        </button>
      </div>
      <div className={styles.friendsRow}>
        {preview.map((f) => (
          <button
            key={f.id}
            type="button"
            className={styles.friendBtn}
            onClick={() => navigate(`/app/profile/${f.other_user.username}`)}
          >
            <UserAvatar user={f.other_user} size="sm" />
            <span className={styles.friendName}>
              {f.other_user.display_name || f.other_user.username}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
