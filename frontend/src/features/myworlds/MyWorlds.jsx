import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  FormControl,
  InputAdornment,
  LinearProgress,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import UserAvatar from '../../shared/components/UserAvatar/UserAvatar'
import { WorldForm, emptyWorld, PLACEHOLDER_COPY } from '../dashboard/Dashboard'
import styles from './MyWorlds.module.css'

const PAGE_LABELS = {
  overview: 'Огляд',
  friends: 'Друзі',
  search: 'Пошук',
}

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Спочатку нові' },
  { value: 'created_asc', label: 'Спочатку старі' },
  { value: 'name_asc', label: 'Назва А→Я' },
  { value: 'name_desc', label: 'Назва Я→А' },
  { value: 'progress', label: 'За прогресом' },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'Всі світи' },
  { value: 'public', label: 'Публічні' },
  { value: 'private', label: 'Приватні' },
]

function getCompletionPercent(world) {
  if (!world.todos_count) return 0
  return Math.round((world.todos_done / world.todos_count) * 100)
}

function WorldCard({ world, index }) {
  const percent = getCompletionPercent(world)
  const variant = index % 2 === 0 ? styles.cardCoral : styles.cardTeal

  return (
    <Button
      className={`${styles.worldCard} ${variant}`}
      onClick={() => (location.href = `/app/worlds/${world.id}`)}
      sx={{ '& .MuiTouchRipple-ripple': { color: 'rgba(0, 0, 0, 0.18)' } }}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.cardBadge}>{world.is_public ? 'Публічний' : 'Приватний'}</span>
      </div>
      <h3 className={styles.cardTitle}>{world.name}</h3>
      <div className={styles.cardFooter}>
        <div className={styles.cardOwner}>
          <UserAvatar username={world.owner_username} avatarUrl={world.owner_avatar_url} size="xs" className={styles.ownerAvatarWrap} />
          <span className={styles.ownerName}>{world.owner_username}</span>
        </div>
        <div className={styles.cardProgressTrack}>
          <div className={styles.cardProgressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </Button>
  )
}

export default function MyWorlds() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [activePage, setActivePage] = useState('worlds')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  const [filterBy, setFilterBy] = useState('all')

  const { data: worlds = [], isLoading } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })
  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const filtered = useMemo(() => {
    let list = [...worlds]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.description || '').toLowerCase().includes(q) ||
          (w.seed || '').toLowerCase().includes(q),
      )
    }
    if (filterBy === 'public') list = list.filter((w) => w.is_public)
    if (filterBy === 'private') list = list.filter((w) => !w.is_public)

    const pct = (w) => (w.todos_count ? w.todos_done / w.todos_count : 0)
    const sorters = {
      created_desc: (a, b) => b.created_at.localeCompare(a.created_at),
      created_asc: (a, b) => a.created_at.localeCompare(b.created_at),
      name_asc: (a, b) => a.name.localeCompare(b.name, 'uk'),
      name_desc: (a, b) => b.name.localeCompare(a.name, 'uk'),
      progress: (a, b) => pct(b) - pct(a),
    }
    return list.sort(sorters[sortBy] || sorters.created_desc)
  }, [worlds, search, filterBy, sortBy])

  const totalProgress = worlds.length
    ? Math.round(worlds.reduce((sum, w) => sum + getCompletionPercent(w), 0) / worlds.length)
    : 0

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        logoSrc="/worldlog-logo-white.png"
        onNavigate={(id) => {
          if (id === 'home') navigate('/app')
          else if (id === 'friends') navigate('/app/friends')
          else if (id === 'search') navigate('/app/search')
          else setActivePage(id)
        }}
      />

      <div className={styles.page}>
        {activePage !== 'worlds' ? (
          <div className={styles.placeholder}>
            <h1 className={styles.placeholderTitle}>{PAGE_LABELS[activePage]}</h1>
            <p className={styles.placeholderText}>{PLACEHOLDER_COPY[activePage]}</p>
          </div>
        ) : (
          <>
            <section className={styles.hero}>
              <p className={styles.heroGreeting}>Керуйте світами</p>
              <h1 className={styles.heroTitle}>Мої світи</h1>
            </section>

            <div className={styles.toolbar}>
              <TextField
                className={styles.searchField}
                label="Пошук"
                placeholder="Назва, опис або сід…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon className={styles.controlIcon} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl className={styles.control}>
                <TextField
                  select
                  label="Сортування"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
              <FormControl className={styles.control}>
                <TextField
                  select
                  label="Фільтр"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  {FILTER_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
            </div>

            <div className={styles.statsBar}>
              <span className={styles.statsText}>
                {filtered.length}{' '}
                {filtered.length === 1 ? 'світ' : filtered.length < 5 ? 'світи' : 'світів'}
              </span>
              <div className={styles.statsRight}>
                <span className={styles.statsText}>{totalProgress}% задач виконано</span>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
                </div>
              </div>
            </div>

            {isLoading && <LinearProgress className={styles.loader} />}

            {!isLoading && filtered.length === 0 && (
              <p className={styles.emptyMsg}>
                {worlds.length === 0
                  ? 'Ще немає жодного світу. Створи перший!'
                  : 'Нічого не знайдено. Спробуй змінити пошук або фільтр.'}
              </p>
            )}

            <div className={styles.grid}>
              {filtered.map((w, i) => (
                <WorldCard key={w.id} world={w} index={i} />
              ))}

              <Button
                className={`${styles.worldCard} ${styles.addCard}`}
                onClick={() => setOpen(true)}
                sx={{ '& .MuiTouchRipple-ripple': { color: 'rgba(255, 255, 255, 0.3)' } }}
              >
                <AddIcon className={styles.addIcon} />
                <span className={styles.addText}>Новий світ</span>
              </Button>
            </div>
          </>
        )}
      </div>

      <WorldForm
        dark
        open={open}
        onClose={() => setOpen(false)}
        initial={emptyWorld}
        onSubmit={(data) => createWorld.mutateAsync(data).then(() => setOpen(false))}
      />
    </div>
  )
}
