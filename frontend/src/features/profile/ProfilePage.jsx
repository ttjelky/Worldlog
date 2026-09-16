import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import api from '../../api'
import { useAuth } from '../../auth'
import Navbar from '../../shared/components/Navbar/Navbar'
import { goSection } from '../../shared/utils/navigation'
import { useFeedback } from '../../shared/feedback/FeedbackProvider'
import ProfileHeader from './components/ProfileHeader'
import ProfileStats from './components/ProfileStats'
import ProfileWorlds from './components/ProfileWorlds'
import ProfileFriends from './components/ProfileFriends'
import ProfileMutual from './components/ProfileMutual'
import ProfileQuickActions from './components/ProfileQuickActions'
import ProfileAccount from './components/ProfileAccount'
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
  const { user: currentUser, updateUser, hydrating } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { notify } = useFeedback()
  const [isEditing, setIsEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const avatarUrlRef = useRef(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const coverUrlRef = useRef(null)

  // Поки сесія гідрується — не вирішуємо свій/чужий, щоб не миготіти.
  const authReady = !username || !hydrating
  const isOwnProfile = authReady && (!username || username === currentUser?.username)

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: isOwnProfile ? ['me'] : ['userProfile', username],
    queryFn: () =>
      isOwnProfile
        ? api.get('/me/').then((r) => r.data)
        : api.get(`/users/${username}/`).then((r) => r.data),
    enabled: isOwnProfile ? !!currentUser : (!!username && authReady),
  })

  const profileName = isOwnProfile ? currentUser?.username : username
  const { data: profileWorlds = [] } = useQuery({
    queryKey: ['userWorlds', profileName || 'me'],
    queryFn: () => api.get(`/users/${profileName}/worlds/`).then((r) => r.data),
    enabled: !!profileName && (!!profileData || isOwnProfile),
    staleTime: 30000,
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
      avatarFile !== null ||
      coverFile !== null ||
      coverRemoved
    )
  }, [editForm.username, editForm.display_name, editForm.bio, avatarFile, coverFile, coverRemoved, isEditing])

  const { showConfirm, warn, confirm: confirmDiscard, cancel: cancelDiscard } = useUnsavedChangesWarning(hasChanges)

  // Попередження при закритті/перезавантаженні вкладки з незбереженими змінами
  useEffect(() => {
    if (!hasChanges) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasChanges])

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
    setCoverPreview(null)
    setCoverFile(null)
    setCoverRemoved(false)
    setIsEditing(true)
  }, [profileData])

  const exitEditMode = useCallback(() => {
    setIsEditing(false)
    setEditForm((f) => ({ ...f, errors: {} }))
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current)
      avatarUrlRef.current = null
    }
    if (coverUrlRef.current) {
      URL.revokeObjectURL(coverUrlRef.current)
      coverUrlRef.current = null
    }
    setAvatarPreview(null)
    setAvatarFile(null)
    setCoverPreview(null)
    setCoverFile(null)
    setCoverRemoved(false)
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
    // Скидаємо input, щоб можна було вибрати той самий файл повторно.
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setEditForm((f) => ({ ...f, errors: { ...f.errors, avatar: 'Потрібен файл зображення (JPG, PNG, WEBP, GIF)' } }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditForm((f) => ({ ...f, errors: { ...f.errors, avatar: 'Файл занадто великий (макс. 5 МБ)' } }))
      return
    }
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current)
    avatarUrlRef.current = URL.createObjectURL(file)
    setAvatarFile(file)
    setAvatarPreview(avatarUrlRef.current)
    setEditForm((f) => ({ ...f, errors: { ...f.errors, avatar: undefined } }))
  }, [])

  const handleAvatarRemove = useCallback(() => {
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current)
      avatarUrlRef.current = null
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditForm((f) => ({ ...f, errors: { ...f.errors, avatar: undefined } }))
  }, [])

  // Чистимо object URL при розмонтуванні.
  useEffect(
    () => () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current)
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current)
    },
    [],
  )

  const handleCoverSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setEditForm((f) => ({ ...f, errors: { ...f.errors, cover: 'Потрібен файл зображення (JPG, PNG, WEBP, GIF)' } }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditForm((f) => ({ ...f, errors: { ...f.errors, cover: 'Файл занадто великий (макс. 5 МБ)' } }))
      return
    }
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current)
    coverUrlRef.current = URL.createObjectURL(file)
    setCoverFile(file)
    setCoverPreview(coverUrlRef.current)
    setCoverRemoved(false)
    setEditForm((f) => ({ ...f, errors: { ...f.errors, cover: undefined } }))
  }, [])

  const handleCoverRemove = useCallback(() => {
    if (coverUrlRef.current) {
      URL.revokeObjectURL(coverUrlRef.current)
      coverUrlRef.current = null
    }
    setCoverFile(null)
    setCoverPreview(null)
    // Позначка: при збереженні видалити поточну обкладинку на сервері.
    setCoverRemoved(true)
    setEditForm((f) => ({ ...f, errors: { ...f.errors, cover: undefined } }))
  }, [])

  const saveProfile = useMutation({
    mutationFn: async () => {
      // Один PATCH одним FormData: поля + аватар + обкладинка разом, щоб не було
      // розсинхрону "поля збереглись, аватар — ні".
      const fd = new FormData()
      const initial = initialFormRef.current
      if (editForm.username !== initial.username) fd.append('username', editForm.username)
      if (editForm.display_name !== initial.display_name) fd.append('display_name', editForm.display_name)
      if (editForm.bio !== initial.bio) fd.append('bio', editForm.bio)
      if (avatarFile) fd.append('avatar', avatarFile)
      if (coverFile) fd.append('cover', coverFile)
      else if (coverRemoved) fd.append('cover_clear', 'true')
      // FormData порожнім не шлемо — нічого не змінилось.
      if ([...fd.keys()].length === 0) return { userData: null, noop: true }
      const res = await api.patch('/me/profile/', fd)
      return { userData: res.data }
    },
    onSuccess: async ({ userData, noop }) => {
      if (noop) {
        exitEditMode()
        return
      }
      if (userData) {
        const prevUsername = initialFormRef.current.username
        updateUser({
          username: userData.username,
          display_name: userData.display_name || '',
          bio: userData.bio || '',
          avatar_url: userData.avatar_url || null,
          cover_url: userData.cover_url || null,
        })
        // Після зміни username роут старіє — ведемо на новий.
        if (userData.username && userData.username !== prevUsername && !username) {
          navigate('/app/profile', { replace: true })
        } else if (userData.username && username && userData.username !== username) {
          navigate(`/app/profile/${userData.username}`, { replace: true })
        }
      }
      qc.invalidateQueries(['me'])
      qc.invalidateQueries(['userProfile', username])
      exitEditMode()
      notify('Профіль оновлено')
    },
    onError: (err) => {
      if (err.response?.data) {
        const fieldErrors = {}
        const data = err.response.data
        if (data.username) fieldErrors.username = Array.isArray(data.username) ? data.username[0] : data.username
        if (data.display_name) fieldErrors.display_name = Array.isArray(data.display_name) ? data.display_name[0] : data.display_name
        if (data.bio) fieldErrors.bio = Array.isArray(data.bio) ? data.bio[0] : data.bio
        if (data.avatar) fieldErrors.avatar = Array.isArray(data.avatar) ? data.avatar[0] : data.avatar
        if (data.cover) fieldErrors.cover = Array.isArray(data.cover) ? data.cover[0] : data.cover
        if (data.detail) fieldErrors.general = data.detail
        setEditForm((f) => ({ ...f, errors: fieldErrors }))
      } else {
        notify('Не вдалося зберегти зміни')
      }
    },
  })

  const sendRequest = useMutation({
    mutationFn: (userId) => api.post('/friends/send/', { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      notify('Запит надіслано')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося надіслати запит')
    },
  })

  const acceptRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/accept/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      notify('Запит прийнято')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося прийняти запит')
    },
  })

  const rejectRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/reject/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      notify('Запит відхилено')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося відхилити запит')
    },
  })

  const cancelRequest = useMutation({
    mutationFn: (friendshipId) => api.post(`/friends/${friendshipId}/cancel/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      notify('Запит скасовано')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося скасувати запит')
    },
  })

  const removeFriend = useMutation({
    mutationFn: (friendshipId) => api.delete(`/friends/${friendshipId}/`),
    onSuccess: () => {
      qc.invalidateQueries(['userProfile', username])
      qc.invalidateQueries(['friends'])
      notify('Користувача видалено з друзів')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося видалити з друзів')
    },
  })

  const friendship = useMemo(() => profileData?.friendship || null, [profileData])

  const scrollToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const friendshipActions = useMemo(
    () => ({
      onSend: () => profileData?.id && sendRequest.mutate(profileData.id),
      onAccept: () => friendship?.id && acceptRequest.mutate(friendship.id),
      onReject: () => friendship?.id && rejectRequest.mutate(friendship.id),
      onCancel: () => friendship?.id && cancelRequest.mutate(friendship.id),
      onRemove: () => friendship?.id && removeFriend.mutate(friendship.id),
      onEdit: enterEditMode,
      pending: sendRequest.isPending
        ? 'send'
        : acceptRequest.isPending
          ? 'accept'
          : rejectRequest.isPending
            ? 'reject'
            : cancelRequest.isPending
              ? 'cancel'
              : removeFriend.isPending
                ? 'remove'
                : null,
    }),
    [profileData, friendship, sendRequest, acceptRequest, rejectRequest, cancelRequest, removeFriend, enterEditMode],
  )

  if (isLoading || (username && hydrating)) {
    return (
      <div className={styles.appShell}>
        <Navbar activePage="profile" logoSrc="/worldlog-logo.png" onNavigate={(id) => goSection(id, navigate)} />
        <div className={styles.page}>
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    const status = error?.response?.status
    const notFound = status === 404 || (!error && !profileData)
    return (
      <div className={styles.appShell}>
        <Navbar activePage="profile" logoSrc="/worldlog-logo.png" onNavigate={(id) => goSection(id, navigate)} />
        <div className={styles.page}>
          <div className={styles.errorState}>
            <h2 className={styles.errorTitle}>
              {notFound ? 'Профіль не знайдено' : 'Не вдалося завантажити профіль'}
            </h2>
            <p className={styles.errorText}>
              {notFound
                ? 'Користувача з таким іменем не існує.'
                : 'Сталася помилка мережі або сервера. Перевір зʼєднання і спробуй ще раз.'}
            </p>
            {!notFound && (
              <Button className={styles.errorBackBtn} onClick={() => window.location.reload()}>
                Спробувати ще
              </Button>
            )}
            <Button
              className={styles.errorBackBtn}
              onClick={() => navigate('/app')}
              variant={notFound ? undefined : 'text'}
            >
              На головну
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.appShell}>
      <Navbar activePage="profile" logoSrc="/worldlog-logo.png" onNavigate={(id) => goSection(id, navigate)} />

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
          canSave={hasChanges}
          avatarPreview={avatarPreview}
          onAvatarSelect={handleAvatarSelect}
          onAvatarRemove={handleAvatarRemove}
          coverPreview={coverPreview}
          coverRemoved={coverRemoved}
          onCoverSelect={handleCoverSelect}
          onCoverRemove={handleCoverRemove}
        />

        {isOwnProfile && <ProfileQuickActions />}

        <ProfileStats
          worldsCount={profileData.worlds_count ?? 0}
          friendsCount={profileData.friends_count ?? 0}
          onWorldsClick={() => scrollToSection('profile-worlds')}
          onFriendsClick={() => {
            if (isOwnProfile) navigate('/app/friends')
            else scrollToSection('profile-friends')
          }}
        />

        {!isOwnProfile && (
          <ProfileMutual username={profileData.username} theirWorlds={profileWorlds} />
        )}

        <ProfileFriends
          username={profileData.username}
          isOwnProfile={isOwnProfile}
        />

        <ProfileWorlds
          worlds={profileWorlds}
          isOwnProfile={isOwnProfile}
          username={profileData.username}
        />

        <ProfileAbout profile={profileData} isOwnProfile={isOwnProfile} />

        {isOwnProfile && <ProfileAccount username={profileData.username} />}
      </div>

      {/* useBlocker тут не працює: застосунок на BrowserRouter, а не data-роутері.
          Тому діалог підтвердження — лише для кнопки «Скасувати»;
          закриття вкладки ловить beforeunload вище. */}
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
