import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import { useFeedback } from '../../../shared/feedback/FeedbackProvider'
import styles from './ProfileWorlds.module.css'

function readSentAccess() {
  try {
    return JSON.parse(localStorage.getItem('wl-sent-access') || '[]') || []
  } catch {
    return []
  }
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Світи користувача на сторінці профілю.
 * Свої — усі створені (відкриваються). Чужі — лише публічні:
 * відкрити можна ті, де є доступ, інакше — кнопка запиту.
 */
export default function ProfileWorlds({ worlds, isOwnProfile, username }) {
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const [sent, setSent] = useState(readSentAccess)

  const requestAccess = useMutation({
    mutationFn: (worldId) => api.post(`/worlds/${worldId}/access-requests/`),
    onSuccess: (_, worldId) => {
      setSent((prev) => {
        const next = [...new Set([...prev, worldId])]
        try {
          localStorage.setItem('wl-sent-access', JSON.stringify(next))
        } catch {}
        return next
      })
      notify('Запит на доступ надіслано')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося надіслати запит')
    },
  })

  if (!worlds.length) {
    return (
      <section className={styles.card} aria-label="Світи користувача" id="profile-worlds">
        <h3 className={styles.title}>{isOwnProfile ? 'Мої світи' : `Світи · ${username}`}</h3>
        {isOwnProfile ? (
          <p className={styles.empty}>
            Поки немає світів.{' '}
            <button type="button" className={styles.link} onClick={() => navigate('/app/worlds')}>
              Створити перший
            </button>
          </p>
        ) : (
          <p className={styles.empty}>У {username} поки немає публічних світів.</p>
        )}
      </section>
    )
  }

  return (
    <section className={styles.card} aria-label="Світи користувача" id="profile-worlds">
      <h3 className={styles.title}>
        {isOwnProfile ? 'Мої світи' : `Світи · ${username}`} ({worlds.length})
      </h3>
      <div className={styles.list}>
        {worlds.map((w) => {
          const hasAccess = !!w.current_user_role
          const sentRequest = sent.includes(w.id)
          const created = formatDate(w.created_at)
          return (
            <div key={w.id} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.name}>{w.name}</span>
                <span className={styles.badge}>{w.is_public ? 'Публічний' : 'Приватний'}</span>
                {created && <span className={styles.date}>· створено {created}</span>}
              </div>
              {hasAccess ? (
                <button
                  type="button"
                  className={styles.openBtn}
                  onClick={() => navigate(`/app/worlds/${w.id}`)}
                >
                  Відкрити
                </button>
              ) : sentRequest ? (
                <span className={styles.sentBadge}>Запит надіслано</span>
              ) : (
                <button
                  type="button"
                  className={styles.openBtn}
                  disabled={requestAccess.isPending}
                  onClick={() => requestAccess.mutate(w.id)}
                >
                  Запросити доступ
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
