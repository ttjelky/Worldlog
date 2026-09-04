import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, LinearProgress, Snackbar, Tab, Tabs, TextField } from '@mui/material'
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

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries(['friends'])
      setUserSearch('')
      setSnackbar({ open: true, message: 'Запит надіслано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося надіслати запит' })
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
      qc.invalidateQueries(['friends'])
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
      qc.invalidateQueries(['friends'])
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
      qc.invalidateQueries(['friends'])
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

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        logoSrc="/worldlog-logo-white.png"
        onNavigate={(id) => handleNav(id, navigate)}
      />

      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.heroGreeting}>Ваші зв'язки</p>
          <h1 className={styles.heroTitle}>Друзі</h1>
        </section>

        <div className={styles.tabsWrap}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            className={styles.tabs}
          >
            <Tab
              icon={<PeopleIcon />}
              label={`Друзі (${friends.length})`}
              className={styles.tab}
            />
            <Tab
              icon={<MailIcon />}
              label={`Запити (${receivedRequests.length})`}
              className={styles.tab}
            />
          </Tabs>
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
                    startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} />,
                  },
                }}
                className={styles.searchField}
              />
              {userSearch.length >= 2 && (
                <div className={styles.searchResults}>
                  {searchUsers.map((u) => (
                    <div key={u.id} className={styles.searchResult}>
                      <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                      <div className={styles.searchResultInfo}>
                        <span className={styles.searchResultName}>{u.username}</span>
                      </div>
                      <Button
                        size="small"
                        onClick={() => sendRequest.mutate(u.id)}
                        disabled={sendRequest.isPending}
                      >
                        Додати
                      </Button>
                    </div>
                  ))}
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
            loading={acceptRequest.isPending || rejectRequest.isPending}
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
