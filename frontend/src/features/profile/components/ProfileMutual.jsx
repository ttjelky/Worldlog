import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import { useAuth } from '../../../auth'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './ProfileMutual.module.css'

/**
 * Спільний контекст на чужому профілі: спільні друзі та світи.
 * Рахується клієнт-side з уже кешованих списків.
 */
export default function ProfileMutual({ username, theirWorlds = [] }) {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const { data: theirFriends = [] } = useQuery({
    queryKey: ['userFriends', username],
    queryFn: () => api.get(`/users/${username}/friends/`).then((r) => r.data),
    enabled: !!username,
    staleTime: 30000,
  })
  const { data: myFriendships = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends/').then((r) => r.data),
    staleTime: 30000,
  })
  const { data: myWorlds = [] } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
    staleTime: 30000,
  })

  const myFriendIds = new Set(
    myFriendships
      .filter((f) => f.status === 'accepted' && f.other_user)
      .map((f) => f.other_user.id),
  )
  // Себе зі спільних виключаємо (раптом дружба вже є).
  const mutualFriends = theirFriends.filter(
    (u) => myFriendIds.has(u.id) && u.id !== currentUser?.id,
  )
  const myWorldIds = new Set(myWorlds.map((w) => w.id))
  const sharedWorlds = theirWorlds.filter((w) => myWorldIds.has(w.id))

  if (mutualFriends.length === 0 && sharedWorlds.length === 0) return null

  return (
    <section className={styles.card} aria-label="Спільне">
      <h3 className={styles.title}>Спільне</h3>
      {mutualFriends.length > 0 && (
        <div className={styles.block}>
          <span className={styles.label}>Спільні друзі ({mutualFriends.length})</span>
          <div className={styles.row}>
            {mutualFriends.slice(0, 7).map((u) => (
              <button
                key={u.id}
                type="button"
                className={styles.avatarBtn}
                title={u.display_name || u.username}
                aria-label={`Профіль ${u.username}`}
                onClick={() => navigate(`/app/profile/${u.username}`)}
              >
                <UserAvatar user={u} size="xs" />
              </button>
            ))}
          </div>
        </div>
      )}
      {sharedWorlds.length > 0 && (
        <div className={styles.block}>
          <span className={styles.label}>Спільні світи ({sharedWorlds.length})</span>
          <div className={styles.worlds}>
            {sharedWorlds.map((w) => (
              <button
                key={w.id}
                type="button"
                className={styles.worldChip}
                onClick={() => navigate(`/app/worlds/${w.id}`)}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
