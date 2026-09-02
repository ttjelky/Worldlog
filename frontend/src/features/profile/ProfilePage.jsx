import { useMemo, useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import api from '../../api'
import { useAuth } from '../../auth'
import Navbar from '../../shared/components/Navbar/Navbar'
import ProfileHeader from './components/ProfileHeader'
import ProfileStats from './components/ProfileStats'
import ProfileAbout from './components/ProfileAbout'
import ProfileSkeleton from './components/ProfileSkeleton'
import styles from './ProfilePage.module.css'

function useUnsavedChangesWarning(hasChanges) {
  const [showConfirm, setShowConfirm] = useState(false)
  const pendingAction = useRef(null)

  const warn = useCallback(
    (action) => {
      if (hasChanges) {
        pendingAction.current = action
        setShowConfirm(true)
      } else {
        action()
      }
    },
    [hasChanges],
  )

  const confirm = useCallback(() => {
    setShowConfirm(false)
    pendingAction.current?.()
    pendingAction.current = null
  }, [])

  const cancel = useCallback(() => {
    setShowConfirm(false)
    pendingAction.current = null
  }, [])

  return { showConfirm, warn, confirm, cancel }
}

export default function ProfilePage() {
  const { username } = useParams()
  const { user: currentUser, updateUser } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activePage, setActivePage] = useState('profile')
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)

  const isOwnProfile = !username || username === currentUser?.username

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: isOwnProfile ? ['me'] : ['userProfile', username],
    queryFn: () =>
      isOwnProfile
        ? api.get('/me/').then((r) => r.data)
        : api.get(`/users/${username}/`).then((r) => r.data),
    enabled: isOwnProfile ? !!currentUser : !!username,
  })

  const { data: worlds = [] } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
    enabled: isOwnProfile,
  })

  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    errors: {},
  })

  const initialFormRef = useRef(null)

  const hasChanges = useMemo(() => {
    if (!initialFormRef.current || !isEditing) return false
    const init = initialFormRef.current
    return (
      editForm.username !== init.username ||
      editForm.display_name !== init.display_name ||
      editForm.bio !== init.bio ||
      avatarFile !== null
    )
  }, [editForm.username, editForm.display_name, editForm.bio, avatarFile, isEditing])

  const { showConfirm, warn, confirm: confirmDiscard, cancel: cancelDiscard } = useUnsavedChangesWarning(hasChanges)

  const enterEditMode = useCallback(() => {
    if (!profileData) return
    const form = {
      username: profileData.username || '',
      display_name: profileData.display_name || '',
      bio: profileData.bio || '',
      errors: {},
    }
    initialFormRef.current = { ...form }
    setEditForm(form)
    setAvatarPreview(null)
    setAvatarFile(null)
    setIsEditing(true)
  }, [profileData])

  const exitEditMode = useCallback(() => {
    setIsEditing(false)
    setEditForm((f) => ({ ...f, errors: {} }))
    setAvatarPreview(null)
    setAvatarFile(null)
    initialFormRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    if (!hasChanges) {
      exitEditMode()
      return
    }
    warn(exitEditMode)
  }, [hasChanges, warn, exitEditMode])

  const handleEditChange = useCallback((field, value) => {
    setEditForm((f) => ({ ...f, [field]: value, errors: { ...f.errors, [field]: undefined } }))
  }, [])

  const handleAvatarSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setEditForm((f) => ({ ...f, errors: { ...f.errors, avatar: 'Файл занадто великий (макс. 5 МБ)' } }))
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }, [])

  const saveProfile = useMutation({
    mutationFn: async () => {
      const data = {}
      const initial = initialFormRef.current
      if (editForm.username !== initial.username) data.username = editForm.username
      if (editForm.display_name !== initial.display_name) data.display_name = editForm.display_name
      if (editForm.bio !== initial.bio) data.bio = editForm.bio

      const hasProfileChanges = Object.keys(data).length > 0
      const hasAvatar = avatarFile !== null

      if (hasProfileChanges) {
        const res = await api.patch('/me/profile/', data)
        return { userData: res.data, hasAvatar }
      }
      return { userData: null, hasAvatar }
    },
    onSuccess: async ({ userData, hasAvatar }) => {
      let avatarUrl = null
      if (userData) {
        updateUser({
          username: userData.username,
          display_name: userData.display_name || '',
          bio: userData.bio || '',
        })
      }
      if (hasAvatar && avatarFile) {
        try {
          const fd = new FormData()
          fd.append('avatar', avatarFile)
          const res = await api.patch('/me/profile/', fd)
          avatarUrl = res.data.avatar_url || null
          updateUser({ avatar_url: avatarUrl })
        } catch {
          setSnackbar({ open: true, message: 'Аватар оновлено, але сталася помилка завантаження' })
        }
      }
      qc.invalidateQueries(['me'])
      qc.invalidateQueries(['userProfile', username])
      exitEditMode()
      setSnackbar({ open: true, message: 'Профіль оновлено' })
    },
    onError: (err) => {
      if (err.response?.data) {
        const fieldErrors = {}
        const data = err.response.data
        if (data.username) fieldErrors.username = Array.isArray(data.username) ? data.username[0] : data.username
        if (data.display_name) fieldErrors.display_name = Array.isArray(data.display_name) ? data.display_name[0] : data.display_name
        if (data.bio) fieldErrors.bio = Array.isArray(data.bio) ? data.bio[0] : data.bio
        if (data.detail) fieldErrors.general = data.detail
        setEditForm((f) => ({ ...f, errors: fieldErrors }))
      } else {
        setSnackbar({ open: true, message: 'Не вдалося зберегти зміни' })
      }
    },
  })

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      setSnackbar({ open: true, message: 'Запит надіслано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося надіслати запит' })
    },
  })

  const acceptRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/accept/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      setSnackbar({ open: true, message: 'Запит прийнято' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося прийняти запит' })
    },
  })

  const rejectRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/reject/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      setSnackbar({ open: true, message: 'Запит відхилено' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося відхилити запит' })
    },
  })

  const cancelRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/cancel/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      setSnackbar({ open: true, message: 'Запит скасовано' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося скасувати запит' })
    },
  })

  const removeFriend = useMutation({
    mutationFn: (friendshipId) => api.delete(`/friends/${friendshipId}/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      setSnackbar({ open: true, message: 'Користувача видалено з друзів' })
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Не вдалося видалити з друзів' })
    },
  })

  const friendship = useMemo(() => profileData?.friendship || null, [profileData])

  const friendshipActions = useMemo(
    () => ({
      onSend: () => profileData?.id && sendRequest.mutate(profileData.id),
      onAccept: () => friendship?.id && acceptRequest.mutate(friendship.id),
      onReject: () => friendship?.id && rejectRequest.mutate(friendship.id),
      onCancel: () => friendship?.id && cancelRequest.mutate(friendship.id),
      onRemove: () => friendship?.id && removeFriend.mutate(friendship.id),
      onEdit: enterEditMode,
      loading: sendRequest.isPending || acceptRequest.isPending || rejectRequest.isPending || cancelRequest.isPending || removeFriend.isPending,
    }),
    [profileData, friendship, sendRequest, acceptRequest, rejectRequest, cancelRequest, removeFriend, enterEditMode],
  )

  if (isLoading) {
    return (
      <div className={styles.appShell}>
        <Navbar activePage={activePage} logoSrc="/worldlog-logo-white.png" onNavigate={(id) => handleNav(id, navigate)} />
        <div className={styles.page}>
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className={styles.appShell}>
        <Navbar activePage={activePage} logoSrc="/worldlog-logo-white.png" onNavigate={(id) => handleNav(id, navigate)} />
        <div className={styles.page}>
          <div className={styles.errorState}>
            <h2 className={styles.errorTitle}>Профіль не знайдено</h2>
            <p className={styles.errorText}>Користувача з таким іменем не існує або сталася помилка.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.appShell}>
      <Navbar activePage={activePage} logoSrc="/worldlog-logo-white.png" onNavigate={(id) => handleNav(id, navigate)} />

      <div className={styles.page}>
        <ProfileHeader
          profile={profileData}
          isOwnProfile={isOwnProfile}
          friendship={friendship}
          actions={friendshipActions}
          isEditing={isEditing}
          editForm={editForm}
          onEditChange={handleEditChange}
          onSave={() => saveProfile.mutate()}
          onCancel={handleCancel}
          savePending={saveProfile.isPending}
          avatarPreview={avatarPreview}
          onAvatarSelect={handleAvatarSelect}
        />

        <ProfileStats
          worldsCount={isOwnProfile ? worlds.length : profileData.worlds_count}
          friendsCount={profileData.friends_count}
        />

        <ProfileAbout
          profile={profileData}
          isOwnProfile={isOwnProfile}
          isEditing={isEditing}
          editForm={editForm}
          onEditChange={handleEditChange}
        />
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

      <Dialog open={showConfirm} onClose={cancelDiscard} maxWidth="xs" fullWidth slotProps={{ paper: { className: styles.confirmPaper } }}>
        <DialogTitle className={styles.confirmTitle}>Є незбережені зміни</DialogTitle>
        <DialogContent>
          <p className={styles.confirmText}>Вийти без збереження?</p>
        </DialogContent>
        <DialogActions className={styles.confirmActions}>
          <Button onClick={cancelDiscard} className={styles.confirmCancelBtn}>
            Залишитися
          </Button>
          <Button onClick={confirmDiscard} className={styles.confirmDiscardBtn}>
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
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
