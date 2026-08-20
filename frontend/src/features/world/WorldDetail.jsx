import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid2'
import { Button, Card, CardContent, Chip, LinearProgress, Tab, Tabs } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import { useParams } from 'react-router-dom'
import api from '../../api'
import PlayersSection from './components/PlayersSection/PlayersSection'
import LocationsSection from './components/LocationsSection/LocationsSection'
import TodosSection from './components/TodosSection/TodosSection'
import HistorySection from './components/HistorySection/HistorySection'
import styles from './WorldDetail.module.css'

const tabs = [
  ['overview', 'Огляд', null],
  ['players', 'Гравці', GroupsOutlinedIcon],
  ['locations', 'Локації', PlaceOutlinedIcon],
  ['todos', 'Todo', CheckCircleOutlineOutlinedIcon],
  ['history', 'Історія', TimelineOutlinedIcon],
]

export default function WorldDetail({ onBack }) {
  const { worldId } = useParams()
  const [tab, setTab] = useState('overview')
  const { data: world, isLoading } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  if (isLoading) return <LinearProgress />
  if (!world) return <p>Світ не знайдено</p>

  const stats = [
    ['Гравці', world.players_count],
    ['Локації', world.locations_count],
    ['Todo', world.todos_done + '/' + world.todos_count],
    ['Події', world.history_count],
  ]

  return (
    <div>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowBackIcon fontSize="small" />
        До всіх світів
      </button>

      <Card className={styles.coverCard}>
        {world.cover_image_url ? (
          <img className={styles.coverImg} src={world.cover_image_url} alt={world.name} />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
        <CardContent className={styles.coverContent}>
          <h3 className={styles.worldTitle}>{world.name}</h3>
          <p className={styles.worldDesc}>{world.description || 'Немає опису'}</p>
          <div className={styles.metaRow}>
            {world.seed && <Chip label={`Сід: ${world.seed}`} variant="outlined" />}
            {world.start_date && <Chip label={`Початок: ${world.start_date}`} variant="outlined" />}
            <Chip label={`Власник: ${world.owner_username}`} variant="outlined" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} className={styles.tabs}>
        {tabs.map(([v, label, Icon]) => (
          <Tab
            key={v}
            value={v}
            label={label}
            icon={Icon ? <Icon fontSize="small" /> : undefined}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {tab === 'overview' && (
        <Grid container spacing={3}>
          {stats.map(([label, value]) => (
            <Grid size={{ xs: 6, md: 3 }} key={label}>
              <Card>
                <CardContent className={styles.statCard}>
                  <span className={styles.statValue}>{value}</span>
                  <span className={styles.statLabel}>{label}</span>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {tab === 'players' && <PlayersSection worldId={worldId} />}
      {tab === 'locations' && <LocationsSection worldId={worldId} />}
      {tab === 'todos' && <TodosSection worldId={worldId} />}
      {tab === 'history' && <HistorySection worldId={worldId} />}
    </div>
  )
}
