import { useQuery } from '@tanstack/react-query'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import styles from './ProgressSection.module.css'

function useCount(url, worldId, queryKey, enabled = true) {
  const { data } = useQuery({
    queryKey: [queryKey, String(worldId)],
    queryFn: () => api.get(url).then((r) => r.data),
    enabled,
  })
  return Array.isArray(data) ? data.length : 0
}

export default function ProgressSection({ worldId, accent }) {
  const { data: world } = useQuery({
    queryKey: ['world', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  const notesCount = useCount(`/worlds/${worldId}/notes/`, worldId, 'notes')
  const projectsCount = useCount(`/worlds/${worldId}/projects/`, worldId, 'projects')
  const bookmarksCount = useCount(`/worlds/${worldId}/bookmarks/`, worldId, 'bookmarks')
  const ideasCount = useCount(`/worlds/${worldId}/ideas/`, worldId, 'ideas')
  const wikiCount = useCount(`/worlds/${worldId}/wiki/`, worldId, 'wiki')
  const inspirationCount = useCount(`/worlds/${worldId}/inspiration/`, worldId, 'inspiration')

  const players = world?.players_count ?? 0
  const locations = world?.locations_count ?? 0
  const todosDone = world?.todos_done ?? 0
  const todosTotal = world?.todos_count ?? 0
  const history = world?.history_count ?? 0

  const stats = [
    { value: players, label: 'Гравці' },
    { value: locations, label: 'Локації' },
    { value: `${todosDone}/${todosTotal}`, label: 'Завдання' },
    { value: history, label: 'Події' },
    { value: notesCount, label: 'Нотатки' },
    { value: projectsCount, label: 'Проєкти' },
    { value: bookmarksCount, label: 'Закладки' },
    { value: ideasCount, label: 'Ідеї' },
    { value: wikiCount, label: 'Wiki-сторінки' },
    { value: inspirationCount, label: 'Натхнення' },
  ]

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Прогрес</h3>
      </div>

      <div className={sharedStyles.body}>
        <div className={styles.statsGrid}>
          {stats.map(({ value, label }) => (
            <div key={label} className={styles.statTile}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
