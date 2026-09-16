import { useQuery } from '@tanstack/react-query'
import api from '../../../api'
import { summarizeWorlds } from '../worldStats'
import dashStyles from '../Dashboard.module.css'
import styles from './HomeSections.module.css'

/**
 * Статистика Головної: ті самі числа, що й плитки Огляду
 * (summarizeWorlds — спільний helper), плюс друзі.
 * Усі значення — з реальних ['worlds'] / ['friends'], без хардкоду.
 * Оформлення — surfaces поточної lavender-сторінки, а не випадкові кольори.
 */
export function HomeStats({ worlds }) {
  const { data } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends/').then((r) => r.data),
    staleTime: 30000,
    retry: 1,
  })

  const { total, done, all, avg } = summarizeWorlds(worlds)
  const friendsCount = (Array.isArray(data) ? data : []).filter(
    (f) => f.status === 'accepted',
  ).length

  const tiles = [
    ['Світи', total],
    ['Задач виконано', `${done}/${all}`],
    ['Друзі', friendsCount],
    ['Середній прогрес', `${avg}%`],
  ]

  return (
    <section className={styles.section} aria-label="Статистика">
      <div className={`${dashStyles.overviewTiles} ${styles.tiles4}`}>
        {tiles.map(([label, value]) => (
          <div key={label} className={styles.statTile}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
