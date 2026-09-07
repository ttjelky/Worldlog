import { useQuery } from '@tanstack/react-query'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import { useExpandableCard } from '../shared/ExpandableCard'
import styles from './ProgressSection.module.css'

function useCount(url, worldId, queryKey, enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, String(worldId)],
    queryFn: () => api.get(url).then((r) => r.data),
    enabled,
  })
  return { count: Array.isArray(data) ? data.length : 0, loading: isLoading }
}

export default function ProgressSection({ worldId, accent }) {
  const section = useExpandableCard()
  const { data: world, isLoading: worldLoading } = useQuery({
    queryKey: ['world', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  const notes = useCount(`/worlds/${worldId}/notes/`, worldId, 'notes')
  const projects = useCount(`/worlds/${worldId}/projects/`, worldId, 'projects')
  const bookmarks = useCount(`/worlds/${worldId}/bookmarks/`, worldId, 'bookmarks')
  const ideas = useCount(`/worlds/${worldId}/ideas/`, worldId, 'ideas')
  const wiki = useCount(`/worlds/${worldId}/wiki/`, worldId, 'wiki')

  const players = world?.players_count ?? 0
  const locations = world?.locations_count ?? 0
  const todosDone = world?.todos_done ?? 0
  const todosTotal = world?.todos_count ?? 0
  const history = world?.history_count ?? 0
  const todosPct = todosTotal ? Math.round((todosDone / todosTotal) * 100) : 0

  const loading =
    worldLoading || notes.loading || projects.loading || bookmarks.loading || ideas.loading || wiki.loading

  const stats = [
    { value: players, label: 'Гравці' },
    { value: locations, label: 'Локації' },
    { value: `${todosDone}/${todosTotal}`, label: 'Завдання', bar: todosPct },
    { value: history, label: 'Події' },
    { value: notes.count, label: 'Нотатки' },
    { value: projects.count, label: 'Проєкти' },
    { value: bookmarks.count, label: 'Закладки' },
    { value: ideas.count, label: 'Ідеї' },
    { value: wiki.count, label: 'Wiki-сторінки' },
  ]

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Прогрес</h3>
      </div>

      <div className={sharedStyles.body}>
        {loading ? (
          <div className={styles.statsGrid} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${styles.statTile} ${styles.statSkeleton}`} />
            ))}
          </div>
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
