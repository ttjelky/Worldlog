import { useQuery } from '@tanstack/react-query'
import { Button, LinearProgress } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useParams } from 'react-router-dom'
import api from '../../api'
import backBtnStyles from '../../shared/styles/backButton.module.css'
import PlayersSection from './components/PlayersSection/PlayersSection'
import LocationsSection from './components/LocationsSection/LocationsSection'
import TodosSection from './components/TodosSection/TodosSection'
import HistorySection from './components/HistorySection/HistorySection'
import sharedStyles from './components/shared/section.module.css'
import styles from './WorldDetail.module.css'

// Кольорова палітра дошки: червоний і зелений чергуються між картками.
const RED = '#A63C39'
const GREEN = '#247A57'

function InfoCard({ world }) {
  const stats = [
    ['Гравці', world.players_count],
    ['Локації', world.locations_count],
    ['Todo', `${world.todos_done}/${world.todos_count}`],
    ['Події', world.history_count],
  ]

  return (
    <div className={sharedStyles.card} style={{ '--accent': RED }}>
      {world.cover_image_url && (
        <img className={styles.coverImg} src={world.cover_image_url} alt={world.name} />
      )}
      <h2 className={styles.infoTitle}>{world.name}</h2>
      <p className={styles.infoDesc}>{world.description || 'Немає опису'}</p>

      <div className={styles.metaRow}>
        {world.seed && <span className={styles.metaChip}>Сід: {world.seed}</span>}
        {world.start_date && <span className={styles.metaChip}>Початок: {world.start_date}</span>}
        <span className={styles.metaChip}>Власник: {world.owner_username}</span>
      </div>

      <div className={styles.statsMini}>
        {stats.map(([label, value]) => (
          <div key={label} className={styles.statTile}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WorldDetail({ onBack }) {
  const { worldId } = useParams()
  const { data: world, isLoading } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  if (isLoading) return <LinearProgress />
  if (!world) return <p>Світ не знайдено</p>

  return (
    <div className={styles.page}>
      <Button className={backBtnStyles.backBtn} onClick={onBack}>
        <ArrowBackIcon fontSize="small" />
        До всіх світів
      </Button>

      {/* Дошка світу: картки-секції розташовані вільно, без вкладок.
          Позиції зараз статичні (масонрі-розкладка + легкий нахил),
          пізніше сюди додасться drag & resize кожної картки. */}
      <div className={styles.board}>
        <div className={`${styles.slot} ${styles.slotInfo}`}>
          <InfoCard world={world} />
        </div>

        <div className={`${styles.slot} ${styles.slotPlayers}`}>
          <PlayersSection worldId={worldId} accent={GREEN} />
        </div>

        <div className={`${styles.slot} ${styles.slotLocations}`}>
          <LocationsSection worldId={worldId} accent={RED} />
        </div>

        <div className={`${styles.slot} ${styles.slotTodos}`}>
          <TodosSection worldId={worldId} accent={GREEN} />
        </div>

        <div className={`${styles.slot} ${styles.slotHistory}`}>
          <HistorySection worldId={worldId} accent={RED} />
        </div>
      </div>
    </div>
  )
}
