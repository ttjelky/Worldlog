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
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../api'
import { useAuth } from '../../auth'
import Navbar from '../../shared/components/Navbar/Navbar'
import { goSection } from '../../shared/utils/navigation'
import { useFeedback } from '../../shared/feedback/FeedbackProvider'
import WorldCard, { getCompletionPercent } from '../../shared/components/WorldCard/WorldCard'
import { WorldForm, emptyWorld } from '../dashboard/Dashboard'
import styles from './MyWorlds.module.css'

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

export default function MyWorlds() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { notify } = useFeedback()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  const [filterBy, setFilterBy] = useState('all')

  const {
    data: worlds = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })
  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries(['worlds'])
      notify('Світ створено')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося створити світ')
    },
  })

  const filtered = useMemo(() => {
    let list = [...worlds]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (w) =>
          (w.name || '').toLowerCase().includes(q) ||
          (w.description || '').toLowerCase().includes(q) ||
          (w.seed || '').toLowerCase().includes(q),
      )
    }
    if (filterBy === 'public') list = list.filter((w) => w.is_public)
    if (filterBy === 'private') list = list.filter((w) => !w.is_public)

    const pct = (w) => (w.todos_count ? w.todos_done / w.todos_count : 0)
    const sorters = {
      created_desc: (a, b) => (b.created_at || '').localeCompare(a.created_at || ''),
      created_asc: (a, b) => (a.created_at || '').localeCompare(b.created_at || ''),
      name_asc: (a, b) => (a.name || '').localeCompare(b.name || '', 'uk'),
      name_desc: (a, b) => (b.name || '').localeCompare(a.name || '', 'uk'),
      progress: (a, b) => pct(b) - pct(a),
    }
    return list.sort(sorters[sortBy] || sorters.created_desc)
  }, [worlds, search, filterBy, sortBy])

  const myWorlds = useMemo(
    () => filtered.filter((w) => w.owner === currentUser?.id),
    [filtered, currentUser],
  )
  const sharedWorlds = useMemo(
    () => filtered.filter((w) => w.owner !== currentUser?.id),
    [filtered, currentUser],
  )

  const totalProgress = worlds.length
    ? Math.round(worlds.reduce((sum, w) => sum + getCompletionPercent(w), 0) / worlds.length)
    : 0

  const hasActiveFilters = search.trim() !== '' || sortBy !== 'created_desc' || filterBy !== 'all'
  const resetFilters = () => {
    setSearch('')
    setSortBy('created_desc')
    setFilterBy('all')
  }

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage="worlds"
        logoSrc="/worldlog-logo.png"
        onNavigate={(id) => goSection(id, navigate)}
      />

      <div className={styles.page}>
        <div className={styles.toolbar}>
          <TextField
            className={styles.searchField}
            label="Пошук"
            placeholder="Шукати мої світи…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className={styles.controlIcon} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setSearch('')}
                      aria-label="Очистити фільтр"
                    >
                      <ClearIcon fontSize="small" />
                    </button>
                  </InputAdornment>
                ) : null,
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
          {hasActiveFilters && (
            <button type="button" className={styles.resetBtn} onClick={resetFilters}>
              Скинути
            </button>
          )}
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

        {!isLoading && isError && (
          <div className={styles.loadError}>
            <p className={styles.emptyMsg}>Не вдалося завантажити світи.</p>
            <button type="button" className={styles.resetBtn} onClick={() => refetch()}>
              Спробувати ще
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <p className={styles.emptyMsg}>
            {worlds.length === 0
              ? 'Ще немає жодного світу. Створи перший!'
              : 'Нічого не знайдено. Спробуй змінити пошук або фільтр.'}
          </p>
        )}

        {!isError && (
          <>
            <section className={styles.worldsSection} aria-label="Створені мною світи">
              <h2 className={styles.sectionTitle}>
                Створені мною <span className={styles.sectionCount}>{myWorlds.length}</span>
              </h2>
              <div className={styles.grid}>
                {myWorlds.map((w, i) => (
                  <WorldCard key={w.id} world={w} index={i} tone={i % 2 === 0 ? 'sand' : 'cactus'} />
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
            </section>

            <section className={styles.worldsSection} aria-label="Світи з наданим доступом">
              <h2 className={styles.sectionTitle}>
                Наданий доступ <span className={styles.sectionCount}>{sharedWorlds.length}</span>
              </h2>
              {sharedWorlds.length > 0 ? (
                <div className={styles.grid}>
                  {sharedWorlds.map((w, i) => (
                    <WorldCard key={w.id} world={w} index={i} tone={i % 2 === 0 ? 'sand' : 'cactus'} />
                  ))}
                </div>
              ) : (
                <p className={styles.sectionEmpty}>
                  Ніхто ще не надав тобі доступ до свого світу.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <WorldForm
        open={open}
        onClose={() => setOpen(false)}
        initial={emptyWorld}
        onSubmit={(data) => createWorld.mutateAsync(data).then(() => setOpen(false))}
      />
    </div>
  )
}
