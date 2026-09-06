import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LinearProgress, Snackbar, TextField } from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import MailIcon from '@mui/icons-material/Mail'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../api'
import { useAuth } from '../../auth'
import Navbar from '../../shared/components/Navbar/Navbar'
import UserAvatar from '../../shared/components/UserAvatar/UserAvatar'
import FriendsList from './components/FriendsList'
import FriendRequestsList from './components/FriendRequestsList'
import FriendsSkeleton from './components/FriendsSkeleton'
import styles from './FriendsPage.module.css'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [activePage, setActivePage] = useState('friends')
  const [tab, setTab] = useState(searchParams.get('tab') === 'requests' ? 1 : 0)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [userSearch, setUserSearch] = useState('')

  const { data: searchUsers = [] } = useQuery({
    queryKey: ['userSearch', userSearch],
    queryFn: () => api.get('/users/search/', { params: { q: userSearch } }).then((r) => r.data),
    enabled: userSearch.length >= 2,
    staleTime: 5000,
  })

  const refresh = () => {
    qc.invalidateQueries(['friends'])
    qc.invalidateQueries(['userSearch'])
  }

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      refresh()
      setSnackbar({ open: true, message: 'Запит надіслано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося надіслати запит' })
    },
  })

  const cancelRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/cancel/`),
    onSuccess: () => {
      refresh()
      setSnackbar({ open: true, message: 'Запит скасовано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося скасувати запит' })
    },
  })

  useEffect(() => {
    if (searchParams.get('tab') === 'requests') {
      setTab(1)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const {
    data: friendships = [],
    isLoading,
  } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends/').then((r) => r.data),
  })

  const acceptRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/accept/`),
    onSuccess: () => {
      refresh()
      setSnackbar({ open: true, message: 'Запит прийнято' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося прийняти запит',
      })
    },
  })

  const rejectRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/reject/`),
    onSuccess: () => {
      refresh()
      setSnackbar({ open: true, message: 'Запит відхилено' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося відхилити запит',
      })
    },
  })

  const removeFriend = useMutation({
    mutationFn: (id) => api.delete(`/friends/${id}/`),
    onSuccess: () => {
      refresh()
      setSnackbar({ open: true, message: 'Користувача видалено з друзів' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося видалити з друзів',
      })
    },
  })

  const friends = friendships.filter((f) => f.status === 'accepted')
  const receivedRequests = friendships.filter(
    (f) => f.status === 'pending' && f.user_a !== currentUser?.id,
  )
  const sentRequests = friendships.filter(
    (f) => f.status === 'pending' && f.user_a === currentUser?.id,
  )

  // Стан кнопки в результатах пошуку за наявною дружбою
  const searchAction = (u) => {
    const f = u.friendship
    if (!f) return { kind: 'add' }
    if (f.status === 'accepted') return { kind: 'friends' }
    if (f.status === 'pending') {
      return f.user_a === currentUser?.id
        ? { kind: 'cancel', id: f.id }
        : { kind: 'await' }
    }
    return { kind: 'none' }
  }

  const searchBusy = sendRequest.isPending || cancelRequest.isPending

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        logoSrc="/worldlog-logo.png"
        onNavigate={(id) => handleNav(id, navigate)}
      />

      <div className={styles.page}>
        <div className={styles.topBlock}>
          <section className={styles.hero}>
            <p className={styles.heroGreeting}>Ваші зв'язки</p>
            <h1 className={styles.heroTitle}>Друзі</h1>
          </section>

          <div className={styles.tabsWrap}>
            <div className={styles.tabs} role="tablist" aria-label="Розділи друзів">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 0}
                className={`${styles.tab} ${tab === 0 ? styles.tabActive : ''}`}
                onClick={() => setTab(0)}
              >
                <PeopleIcon className={styles.tabIcon} />
                Друзі ({friends.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 1}
                className={`${styles.tab} ${tab === 1 ? styles.tabActive : ''}`}
                onClick={() => setTab(1)}
              >
                <MailIcon className={styles.tabIcon} />
                Запити ({receivedRequests.length})
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <>
            <LinearProgress className={styles.loader} />
            <FriendsSkeleton />
          </>
        ) : tab === 0 ? (
          <>
            <div className={styles.searchWrap}>
              <TextField
                fullWidth
                placeholder="Знайти користувача…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon className={styles.searchIcon} />,
                  },
                }}
                className={styles.searchField}
              />
              {userSearch.length === 1 && (
                <p className={styles.searchHint}>Введи мінімум 2 символи</p>
              )}
              {userSearch.length >= 2 && (
                <div className={styles.searchResults}>
                  {searchUsers.length === 0 ? (
                    <p className={styles.searchHint}>Нічого не знайдено</p>
                  ) : (
                    searchUsers.map((u) => {
                      const action = searchAction(u)
                      return (
                        <div key={u.id} className={styles.searchResult}>
                          <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                          <div className={styles.searchResultInfo}>
                            <span className={styles.searchResultName}>{u.username}</span>
                          </div>
                          {action.kind === 'add' && (
                            <button
                              type="button"
                              className={styles.addBtn}
                              onClick={() => sendRequest.mutate(u.id)}
                              disabled={searchBusy}
                            >
                              Додати
                            </button>
                          )}
                          {action.kind === 'cancel' && (
                            <button
                              type="button"
                              className={styles.cancelBtn}
                              onClick={() => cancelRequest.mutate(action.id)}
                              disabled={searchBusy}
                            >
                              Скасувати
                            </button>
                          )}
                          {action.kind === 'friends' && (
                            <span className={styles.stateBadge}>У друзях</span>
                          )}
                          {action.kind === 'await' && (
                            <span className={styles.stateBadge}>Очікує</span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <FriendsList
              friends={friends}
              onRemove={removeFriend.mutate}
              loading={removeFriend.isPending}
            />
          </>
        ) : (
          <FriendRequestsList
            received={receivedRequests}
            sent={sentRequests}
            onAccept={acceptRequest.mutate}
            onReject={rejectRequest.mutate}
            onCancel={cancelRequest.mutate}
            loading={acceptRequest.isPending || rejectRequest.isPending || cancelRequest.isPending}
          />
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
              background: '#5A4A52',
              color: '#ffffff',
              borderRadius: '22px',
              fontWeight: 500,
              fontSize: 15,
              boxShadow: '0 8px 28px rgba(90, 74, 82, 0.4)',
            },
          },
        }}
      />
    </div>
  )
}

function handleNav(id, navigate) {
  if (id === 'home') navigate('/app')
  else if (id === 'overview') navigate('/app')
  else if (id === 'worlds') navigate('/app/worlds')
  else if (id === 'friends') navigate('/app/friends')
  else if (id === 'search') navigate('/app/search')
}
