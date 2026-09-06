import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Snackbar } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PublicIcon from '@mui/icons-material/Public'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import api from '../../api'
import { useAuth } from '../../auth'
import Navbar from '../../shared/components/Navbar/Navbar'
import UserAvatar from '../../shared/components/UserAvatar/UserAvatar'
import SearchSkeleton from './components/SearchSkeleton'
import styles from './SearchPage.module.css'

export default function SearchPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [activePage, setActivePage] = useState('search')
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [sentAccess, setSentAccess] = useState([])

  // Запит живе в навбарі (?q=), сторінка його лише читає
  const query = (searchParams.get('q') || '').trim()
  const showResults = query.length >= 2

  const { data: worldResults = [], isLoading: worldsLoading } = useQuery({
    queryKey: ['worldSearch', query],
    queryFn: () => api.get(`/worlds/search/?q=${encodeURIComponent(query)}`).then((r) => r.data),
    enabled: showResults,
  })

  const { data: userResults = [], isLoading: usersLoading } = useQuery({
    queryKey: ['userSearch', query],
    queryFn: () => api.get('/users/search/', { params: { q: query } }).then((r) => r.data),
    enabled: showResults,
    staleTime: 5000,
  })

  // Хаб: все доступне за категоріями, коли запиту ще немає
  const { data: myWorlds = [], isLoading: worldsHubLoading } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
    enabled: !showResults,
  })
  const { data: friendships = [], isLoading: friendsHubLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends/').then((r) => r.data),
    enabled: !showResults,
  })

  const refreshFriends = () => {
    qc.invalidateQueries(['friends'])
    qc.invalidateQueries(['userSearch'])
  }

  const requestAccess = useMutation({
    mutationFn: (worldId) => api.post(`/worlds/${worldId}/access-requests/`),
    onSuccess: (_, worldId) => {
      setSentAccess((cur) => (cur.includes(worldId) ? cur : [...cur, worldId]))
      setSnackbar({ open: true, message: 'Запит на доступ надіслано' })
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Не вдалося надіслати запит',
      })
    },
  })

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      refreshFriends()
      setSnackbar({ open: true, message: 'Запит надіслано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося надіслати запит' })
    },
  })

  const cancelRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/cancel/`),
    onSuccess: () => {
      refreshFriends()
      setSnackbar({ open: true, message: 'Запит скасовано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося скасувати запит' })
    },
  })

  const acceptRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/accept/`),
    onSuccess: () => {
      refreshFriends()
      setSnackbar({ open: true, message: 'Запит прийнято' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося прийняти запит' })
    },
  })

  const rejectRequest = useMutation({
    mutationFn: (id) => api.post(`/friends/${id}/reject/`),
    onSuccess: () => {
      refreshFriends()
      setSnackbar({ open: true, message: 'Запит відхилено' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося відхилити запит' })
    },
  })

  const hubFriends = friendships.filter((f) => f.status === 'accepted')
  const hubRequests = friendships.filter(
    (f) => f.status === 'pending' && f.user_a !== currentUser?.id,
  )

  const isLoadingResults = worldsLoading || usersLoading
  const hasResults = worldResults.length > 0 || userResults.length > 0
  const hubLoading = worldsHubLoading || friendsHubLoading
  const hubEmpty = myWorlds.length === 0 && hubFriends.length === 0 && hubRequests.length === 0
  const friendBusy =
    sendRequest.isPending || cancelRequest.isPending || acceptRequest.isPending || rejectRequest.isPending

  const userAction = (u) => {
    const f = u.friendship
    if (!f) return { kind: 'add' }
    if (f.status === 'accepted') return { kind: 'friends' }
    if (f.status === 'pending') {
      return f.user_a === currentUser?.id ? { kind: 'cancel', id: f.id } : { kind: 'await' }
    }
    return { kind: 'none' }
  }

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
            <p className={styles.heroGreeting}>Знайдіть будь-що</p>
            <h1 className={styles.heroTitle}>Пошук</h1>
          </section>
        </div>

        {showResults ? (
          <>
            <div className={styles.resultsInfo}>
              <span className={styles.resultCount}>
                {worldResults.length + userResults.length}{' '}
                {plural(worldResults.length + userResults.length, ['результат', 'результати', 'результатів'])}
                {' '}за запитом «{query}»
              </span>
            </div>

            {isLoadingResults && <SearchSkeleton />}

            {!isLoadingResults && !hasResults && (
              <div className={styles.emptyState}>
                <SearchIcon className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Нічого не знайдено</h3>
                <p className={styles.emptyText}>Спробуйте інший пошуковий запит</p>
              </div>
            )}

            {worldResults.length > 0 && (
              <section className={styles.hubSection} aria-label="Знайдені світи">
                <h2 className={styles.hubTitle}>
                  Світи <span className={styles.hubCount}>{worldResults.length}</span>
                </h2>
                <div className={styles.resultsList}>
                  {worldResults.map((world, i) => (
                    <WorldSearchResult
                      key={world.id}
                      world={world}
                      index={i}
                      accessSent={sentAccess.includes(world.id)}
                      onRequestAccess={(worldId) => requestAccess.mutate(worldId)}
                      loading={requestAccess.isPending}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </section>
            )}

            {userResults.length > 0 && (
              <section className={styles.hubSection} aria-label="Знайдені користувачі">
                <h2 className={styles.hubTitle}>
                  Користувачі <span className={styles.hubCount}>{userResults.length}</span>
                </h2>
                <div className={styles.userList}>
                  {userResults.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      action={userAction(u)}
                      busy={friendBusy}
                      onAdd={() => sendRequest.mutate(u.id)}
                      onCancel={(id) => cancelRequest.mutate(id)}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {hubLoading && <SearchSkeleton />}

            {!hubLoading && hubEmpty && (
              <div className={styles.emptyState}>
                <PublicIcon className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Почни з пошуку</h3>
                <p className={styles.emptyText}>
                  Введи назву світу або ім'я користувача в рядку пошуку нагорі
                </p>
              </div>
            )}

            {myWorlds.length > 0 && (
              <section className={styles.hubSection} aria-label="Мої світи">
                <h2 className={styles.hubTitle}>
                  Світи <span className={styles.hubCount}>{myWorlds.length}</span>
                </h2>
                <div className={styles.resultsList}>
                  {myWorlds.map((world, i) => (
                    <WorldSearchResult
                      key={world.id}
                      world={world}
                      index={i}
                      showAccess={false}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </section>
            )}

            {hubFriends.length > 0 && (
              <section className={styles.hubSection} aria-label="Мої друзі">
                <h2 className={styles.hubTitle}>
                  Друзі <span className={styles.hubCount}>{hubFriends.length}</span>
                </h2>
                <div className={styles.userList}>
                  {hubFriends.map((f) =>
                    f.other_user ? (
                      <UserRow
                        key={f.id}
                        user={f.other_user}
                        action={{ kind: 'open' }}
                        onNavigate={navigate}
                      />
                    ) : null,
                  )}
                </div>
              </section>
            )}

            {hubRequests.length > 0 && (
              <section className={styles.hubSection} aria-label="Запити в друзі">
                <h2 className={styles.hubTitle}>
                  Запити <span className={styles.hubCount}>{hubRequests.length}</span>
                </h2>
                <div className={styles.userList}>
                  {hubRequests.map((f) =>
                    f.other_user ? (
                      <div key={f.id} className={styles.userRow}>
                        <button
                          type="button"
                          className={styles.userMain}
                          onClick={() => navigate(`/app/profile/${f.other_user.username}`)}
                        >
                          <UserAvatar user={f.other_user} size="sm" />
                          <span className={styles.userName}>
                            {f.other_user.display_name || f.other_user.username}
                          </span>
                        </button>
                        <div className={styles.userActions}>
                          <button
                            type="button"
                            className={styles.miniAccept}
                            onClick={() => acceptRequest.mutate(f.id)}
                            disabled={friendBusy}
                            aria-label="Прийняти запит"
                          >
                            <CheckIcon fontSize="small" />
                          </button>
                          <button
                            type="button"
                            className={styles.miniReject}
                            onClick={() => rejectRequest.mutate(f.id)}
                            disabled={friendBusy}
                            aria-label="Відхилити запит"
                          >
                            <CloseIcon fontSize="small" />
                          </button>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              </section>
            )}
          </>
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

function plural(n, [one, few, many]) {
  if (n === 1) return one
  if (n > 1 && n < 5) return few
  return many
}

function UserRow({ user, action, busy, onAdd, onCancel, onNavigate }) {
  return (
    <div className={styles.userRow}>
      <button
        type="button"
        className={styles.userMain}
        onClick={() => onNavigate(`/app/profile/${user.username}`)}
      >
        <UserAvatar user={user} size="sm" />
        <span className={styles.userName}>{user.display_name || user.username}</span>
      </button>
      {action.kind === 'add' && (
        <button type="button" className={styles.addBtn} onClick={onAdd} disabled={busy}>
          Додати
        </button>
      )}
      {action.kind === 'cancel' && (
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => onCancel(action.id)}
          disabled={busy}
        >
          Скасувати
        </button>
      )}
      {action.kind === 'friends' && <span className={styles.stateBadge}>У друзях</span>}
      {action.kind === 'await' && <span className={styles.stateBadge}>Очікує</span>}
    </div>
  )
}

function WorldSearchResult({ world, index = 0, showAccess = true, accessSent, onRequestAccess, loading, onNavigate }) {
  const percent = world.todos_count ? Math.round((world.todos_done / world.todos_count) * 100) : 0
  const variant = index % 2 === 0 ? styles.cardSky : styles.cardSlate

  return (
    <div
      className={`${styles.worldCard} ${variant}`}
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
      <div className={styles.cardTop}>
        <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.cardThemeBadge}>
          {world.is_public ? 'Публічний' : 'Приватний'}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{world.name}</h3>
      <div className={styles.cardFooter}>
        <div className={styles.cardOwner}>
          <UserAvatar
            username={world.owner_username}
            avatarUrl={world.owner_avatar_url}
            size="xs"
            className={styles.ownerAvatarWrap}
          />
          <span className={styles.ownerName}>@{world.owner_username}</span>
        </div>
        <div className={styles.cardProgressTrack}>
          <div className={styles.cardProgressFill} style={{ width: `${percent}%` }} />
        </div>
        {showAccess && (
          accessSent ? (
            <span className={styles.sentBadge}>Запит надіслано</span>
          ) : (
            <button
              type="button"
              className={styles.accessPill}
              onClick={(e) => {
                e.stopPropagation()
                onRequestAccess(world.id)
              }}
              disabled={loading}
            >
              Запросити доступ
            </button>
          )
        )}
      </div>
    </div>
  )
}

function handleNav(id, navigate) {
  if (id === 'home') navigate('/app')
  else if (id === 'overview') navigate('/app')
  else if (id === 'worlds') navigate('/app/worlds')
  else if (id === 'friends') navigate('/app/friends')
  else if (id === 'search') navigate('/app/search')
  else if (id === 'notifications') navigate('/app/notifications')
}
