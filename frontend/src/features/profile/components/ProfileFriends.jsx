import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import styles from './ProfileFriends.module.css'

const SHOWN = 7

/**
 * Друзі користувача рядком аватарок. На своєму профілі — лінк «Всі друзі».
 */
export default function ProfileFriends({ username, isOwnProfile }) {
  const navigate = useNavigate()
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['userFriends', username],
    queryFn: () => api.get(`/users/${username}/friends/`).then((r) => r.data),
    enabled: !!username,
    staleTime: 30000,
  })

  return (
    <section className={styles.card} aria-label="Друзі користувача" id="profile-friends">
      <div className={styles.head}>
        <h3 className={styles.title}>Друзі ({isLoading ? '…' : friends.length})</h3>
        {isOwnProfile && friends.length > 0 && (
          <button
            type="button"
            className={styles.allLink}
            onClick={() => navigate('/app/friends')}
          >
            Всі друзі
          </button>
        )}
      </div>
      {isLoading ? (
        <p className={styles.hint}>Завантаження…</p>
      ) : friends.length === 0 ? (
        <p className={styles.hint}>
          {isOwnProfile ? 'Поки нікого немає. Знайди друзів у розділі «Друзі».' : 'Друзів поки немає.'}
        </p>
      ) : (
        <div className={styles.row}>
          {friends.slice(0, SHOWN).map((u) => (
            <button
              key={u.id}
              type="button"
              className={styles.avatarBtn}
              title={u.display_name || u.username}
              aria-label={`Профіль ${u.username}`}
              onClick={() => navigate(`/app/profile/${u.username}`)}
            >
              <UserAvatar user={u} size="sm" />
            </button>
          ))}
          {friends.length > SHOWN &&
            (isOwnProfile ? (
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => navigate('/app/friends')}
                aria-label="Показати всіх друзів"
              >
                +{friends.length - SHOWN}
              </button>
            ) : (
              <span className={styles.moreBadge} aria-label={`Ще ${friends.length - SHOWN}`}>
                +{friends.length - SHOWN}
              </span>
            ))}
        </div>
      )}
    </section>
  )
}
