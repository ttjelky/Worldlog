import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Snackbar, TextField, InputAdornment, CircularProgress, Button } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AssignmentIcon from '@mui/icons-material/Assignment'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import SearchSkeleton from './components/SearchSkeleton'
import styles from './SearchPage.module.css'

const THEME_LABELS = {
  sulfur_caves: 'Сірчані печери',
  amethyst: 'Аметист',
  trial_palace: 'Палац випробувань',
}

export default function SearchPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activePage, setActivePage] = useState('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['worldSearch', debouncedQuery],
    queryFn: () => api.get(`/worlds/search/?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
  })

  const requestAccess = useMutation({
    mutationFn: (worldId) => api.post(`/worlds/${worldId}/access-requests/`),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Запит на доступ надіслано' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося надіслати запит',
      })
    },
  })

  const handleClear = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    inputRef.current?.focus()
  }, [])

  const showResults = debouncedQuery.length >= 2
  const showEmpty = showResults && !isLoading && results.length === 0

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        logoSrc="/worldlog-logo-white.png"
        onNavigate={(id) => handleNav(id, navigate)}
      />

      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.heroGreeting}>Знайдіть світ</p>
          <h1 className={styles.heroTitle}>Пошук</h1>
        </section>

        <div className={styles.searchBar}>
          <TextField
            inputRef={inputRef}
            className={styles.searchInput}
            placeholder="Назва світу або опис..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className={styles.searchIcon} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    {isLoading ? (
                      <CircularProgress size={20} className={styles.searchSpinner} />
                    ) : (
                      <button
                        className={styles.clearBtn}
                        onClick={handleClear}
                        type="button"
                        aria-label="Очистити пошук"
                      >
                        <ClearIcon fontSize="small" />
                      </button>
                    )}
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </div>

        {showResults && (
          <div className={styles.resultsInfo}>
            <span className={styles.resultCount}>
              {results.length} {results.length === 1 ? 'результат' : results.length < 5 ? 'результати' : 'результатів'}
            </span>
          </div>
        )}

        {isLoading && showResults && <SearchSkeleton />}

        {showEmpty && (
          <div className={styles.emptyState}>
            <SearchIcon className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Нічого не знайдено</h3>
            <p className={styles.emptyText}>
              Спробуйте інший пошуковий запит
            </p>
          </div>
        )}

        {!showResults && (
          <div className={styles.emptyState}>
            <PublicIcon className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Знайдіть публічні світи</h3>
            <p className={styles.emptyText}>
              Введіть назву або опис світу для пошуку
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.resultsList}>
            {results.map((world) => (
              <WorldSearchResult
                key={world.id}
                world={world}
                onRequestAccess={(worldId) => requestAccess.mutate(worldId)}
                loading={requestAccess.isPending}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          content: {
            sx: {
              background: '#2d2d2d',
              color: '#ffffff',
              borderRadius: '22px',
              fontWeight: 500,
              fontSize: 15,
              boxShadow: '0 8px 28px rgba(13, 13, 15, 0.35)',
            },
          },
        }}
      />
    </div>
  )
}

function WorldSearchResult({ world, onRequestAccess, loading, onNavigate }) {
  const themeLabel = THEME_LABELS[world.theme] || world.theme

  return (
    <div
      className={styles.worldCard}
      onClick={() => onNavigate(`/app/worlds/${world.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate(`/app/worlds/${world.id}`)
        }
      }}
    >
      <div className={styles.worldCardHeader}>
        {world.cover_image_url ? (
          <img
            src={world.cover_image_url}
            alt={world.name}
            className={styles.worldCover}
          />
        ) : (
          <div className={styles.worldCoverPlaceholder}>
            <PublicIcon />
          </div>
        )}
        <div className={styles.worldInfo}>
          <span className={styles.worldName}>{world.name}</span>
          <span className={styles.worldOwner}>@{world.owner_username}</span>
          {world.description && (
            <span className={styles.worldDescription}>{world.description}</span>
          )}
        </div>
      </div>
      <div className={styles.worldStats}>
        <span className={styles.worldStat}>
          <PeopleIcon fontSize="small" /> {world.players_count}
        </span>
        <span className={styles.worldStat}>
          <LocationOnIcon fontSize="small" /> {world.locations_count}
        </span>
        <span className={styles.worldStat}>
          <AssignmentIcon fontSize="small" /> {world.todos_done}/{world.todos_count}
        </span>
        <span className={styles.worldThemeBadge}>{themeLabel}</span>
      </div>
      <div className={styles.actionArea}>
        <Button
          className={styles.accessBtn}
          onClick={(e) => {
            e.stopPropagation()
            onRequestAccess(world.id)
          }}
          disabled={loading}
        >
          Запросити доступ
        </Button>
      </div>
    </div>
  )
}

function handleNav(id, navigate) {
  if (id === 'home') navigate('/app')
  else if (id === 'worlds') navigate('/app/worlds')
  else if (id === 'friends') navigate('/app/friends')
  else if (id === 'search') navigate('/app/search')
  else if (id === 'notifications') navigate('/app/notifications')
}
