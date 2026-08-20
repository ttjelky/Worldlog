import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,

  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import { useState } from 'react'
import Grid from '@mui/material/Grid2'
import { useParams } from 'react-router-dom'
import api from '../../api'
import PlayersSection from './PlayersSection'
import LocationsSection from './LocationsSection'
import TodosSection from './TodosSection'
import HistorySection from './HistorySection'

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
  if (!world) return <Typography>Світ не знайдено</Typography>

  const stats = [
    ['Гравці', world.players_count],
    ['Локації', world.locations_count],
    ['Todo', world.todos_done + '/' + world.todos_count],
    ['Події', world.history_count],
  ]

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 3, color: 'text.secondary' }}>
        До всіх світів
      </Button>

      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        {world.cover_image_url ? (
          <Box
            component="img"
            src={world.cover_image_url}
            alt={world.name}
            sx={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box height={120} bgcolor="#E9EAFC" />
        )}
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h3">{world.name}</Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            {world.description || 'Немає опису'}
          </Typography>
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
            {world.seed && <Chip label={`Сід: ${world.seed}`} variant="outlined" />}
            {world.start_date && (
              <Chip label={`Початок: ${world.start_date}`} variant="outlined" />
            )}
            <Chip label={`Власник: ${world.owner_username}`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { fontSize: 14, fontWeight: 700, textTransform: 'none' },
          '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
        }}
      >
        {tabs.map(([v, label, Icon]) => (
          <Tab key={v} value={v} label={label} icon={Icon ? <Icon fontSize="small" /> : undefined} iconPosition="start" />
        ))}
      </Tabs>

      {tab === 'overview' && (
        <Grid container spacing={3}>
          {stats.map(([label, value]) => (
            <Grid size={{ xs: 6, md: 3 }} key={label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h3" sx={{ color: 'primary.main' }}>{value}</Typography>
                  <Typography variant="overline" sx={{ letterSpacing: '.2em', fontWeight: 700 }}>{label}</Typography>
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
    </Box>
  )
}