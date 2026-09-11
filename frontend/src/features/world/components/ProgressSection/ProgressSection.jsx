import { useQuery } from '@tanstack/react-query'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import { useExpandableCard } from '../shared/ExpandableCard'
import styles from './ProgressSection.module.css'

const TILE_COUNT = 9

export default function ProgressSection({ worldId, accent }) {
  const section = useExpandableCard()
  const {
    data: world,
    isLoading: worldLoading,
    isError: worldError,
  } = useQuery({
    queryKey: ['world', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })
  // Усі лічильники вже є в annotate світу — окремих запитів не треба.
  const players = world?.players_count ?? 0
  const locations = world?.locations_count ?? 0
  const todosDone = world?.todos_done ?? 0
  const todosTotal = world?.todos_count ?? 0
  const history = world?.history_count ?? 0
  const todosPct = todosTotal ? Math.round((todosDone / todosTotal) * 100) : 0

  const loading = worldLoading

  const stats = [
    { value: players, label: 'Гравці' },
    { value: locations, label: 'Локації' },
    { value: `${todosDone}/${todosTotal}`, label: 'Завдання', bar: todosPct },
    { value: history, label: 'Події' },
    { value: world?.notes_count ?? 0, label: 'Нотатки' },
    { value: world?.projects_count ?? 0, label: 'Проєкти' },
    { value: world?.bookmarks_count ?? 0, label: 'Закладки' },
    { value: world?.ideas_count ?? 0, label: 'Ідеї' },
    { value: world?.wiki_count ?? 0, label: 'Wiki-сторінки' },
  ]

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Прогрес</h3>
      </div>

      <div className={sharedStyles.body}>
        {loading ? (
          <div className={styles.statsGrid} aria-hidden="true">
            {Array.from({ length: TILE_COUNT }).map((_, i) => (
              <div key={i} className={`${styles.statTile} ${styles.statSkeleton}`} />
            ))}
          </div>
        ) : worldError ? (
          <p className={sharedStyles.emptyMsg}>Не вдалося завантажити статистику.</p>
        ) : (
          <div
            className={`${styles.statsGrid} ${section.full ? styles.statsGridWide : ''}`}
            role="list"
            aria-label="Статистика світу"
          >
            {stats.map(({ value, label, bar }) => (
              <div key={label} className={styles.statTile} role="listitem">
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
                {bar != null && (
                  <span
                    className={styles.statBar}
                    role="progressbar"
                    aria-valuenow={bar}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Виконано завдань: ${bar}%`}
                  >
                    <span className={styles.statFill} style={{ width: `${bar}%` }} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
