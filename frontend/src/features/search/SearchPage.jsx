import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Snackbar, TextField, InputAdornment, CircularProgress } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import SearchResult from './components/SearchResult'
import SearchSkeleton from './components/SearchSkeleton'
import styles from './SearchPage.module.css'

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
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => api.get(`/users/search/?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
  })

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries(['userSearch', debouncedQuery])
      setSnackbar({ open: true, message: 'Запит надіслано' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося надіслати запит',
      })
    },
  })

  const acceptRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/accept/`),
    onSuccess: () => {
      qc.invalidateQueries(['userSearch', debouncedQuery])
      setSnackbar({ open: true, message: 'Запит прийнято' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося прийняти запит',
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
          <p className={styles.heroGreeting}>Знайдіть людей</p>
          <h1 className={styles.heroTitle}>Пошук</h1>
        </section>

        <div className={styles.searchBar}>
          <TextField
            inputRef={inputRef}
            className={styles.searchInput}
            placeholder="Введіть ім'я користувача..."
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
            <h3 className={styles.emptyTitle}>Нікого не знайдено</h3>
            <p className={styles.emptyText}>
              Спробуйте інший пошуковий запит
            </p>
          </div>
        )}

        {!showResults && (
          <div className={styles.emptyState}>
            <SearchIcon className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Знайдіть користувачів</h3>
            <p className={styles.emptyText}>
              Введіть ім'я користувача для пошуку
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.resultsList}>
            {results.map((user) => (
              <SearchResult
                key={user.id}
                user={user}
                onSendFriend={(userId) => sendRequest.mutate(userId)}
                onAcceptFriend={(friendshipId) => acceptRequest.mutate(friendshipId)}
                loading={sendRequest.isPending || acceptRequest.isPending}
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

function handleNav(id, navigate) {
  if (id === 'home') navigate('/app')
  else if (id === 'worlds') navigate('/app/worlds')
  else if (id === 'friends') navigate('/app/friends')
  else if (id === 'search') navigate('/app/search')
}
