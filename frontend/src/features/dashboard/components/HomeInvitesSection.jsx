import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import api from '../../../api'
import { stockCoverFor } from '../../../shared/stockImages'
import styles from './HomeSections.module.css'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

/**
 * «Світи, в які мене запросили»: вихідні PENDING-запити поточного
 * користувача (GET /api/world-access-requests/mine/). Інвайтів від інших
 * у системі немає — лише власні запити на доступ. Прийняти/відхилити їх
 * може тільки власник світу, тому тут лише перегляд + CTA.
 * Без запитів секція не рендериться взагалі.
 */
export function HomeInvitesSection() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['my-access-requests'],
    queryFn: () => api.get('/api/world-access-requests/mine/').then((r) => r.data),
    staleTime: 30000,
    retry: 1,
  })

  const invites = Array.isArray(data) ? data : []
  if (invites.length === 0) return null
  const [first] = invites
  const coverSrc = first.world_cover_url || stockCoverFor(first.world)

  return (
    <section className={styles.section} aria-label="Світи, в які мене запросили">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Світи, в які мене запросили</h2>
        {invites.length > 1 && (
          <button
            type="button"
            className={styles.sectionLink}
            onClick={() => navigate('/app/worlds')}
          >
            На вкладку «Мої світи»
            <ArrowForwardIcon fontSize="small" />
          </button>
        )}
      </div>
      <div className={styles.inviteCard}>
        {coverSrc && (
          <div className={styles.inviteCoverWrap} aria-hidden="true">
            <img src={coverSrc} alt="" className={styles.inviteCover} loading="lazy" decoding="async" />
          </div>
        )}
        <div className={styles.inviteInfo}>
          <span className={styles.inviteName}>{first.world_name}</span>
          <span className={styles.inviteMeta}>
            Власник @{first.world_owner_username}
            {first.created_at ? ` · запит від ${formatDate(first.created_at)}` : ''}
          </span>
        </div>
        <span className={styles.inviteChip}>Очікує підтвердження</span>
      </div>
    </section>
  )
}
