import { useRef, useState } from 'react'
import { Dialog, DialogContent, TextField } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import LinkIcon from '@mui/icons-material/Link'
import CircularProgress from '@mui/material/CircularProgress'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import FriendActionButton from './FriendActionButton'
import { useFeedback } from '../../../shared/feedback/FeedbackProvider'
import sharedStyles from '../../world/components/shared/section.module.css'
import styles from './ProfileHeader.module.css'

function linkifyBio(text) {
  return String(text || '')
    .split(/(https?:\/\/[^\s)]+)/g)
    .map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noreferrer" className={styles.bioLink}>
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  friendship,
  actions,
  isEditing,
  editForm,
  onEditChange,
  onSave,
  onCancel,
  savePending,
  canSave,
  avatarPreview,
  onAvatarSelect,
  onAvatarRemove,
  coverPreview,
  coverRemoved,
  onCoverSelect,
  onCoverRemove,
}) {
  const displayName = profile.display_name || profile.username
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const { notify } = useFeedback()
  const [lightbox, setLightbox] = useState(false)

  const avatarSrc = avatarPreview || profile.avatar_url || null
  const coverSrc = coverPreview || (!coverRemoved && profile.cover_url) || null

  const shareProfile = async () => {
    const url = `${window.location.origin}/app/profile/${profile.username}`
    try {
      await navigator.clipboard.writeText(url)
      notify('Посилання на профіль скопійовано')
    } catch {
      notify('Не вдалося скопіювати посилання')
    }
  }

  return (
    <div className={`${styles.header} ${isEditing ? styles.headerEditing : ''}`}>
      {(coverSrc || isEditing) && (
        <div className={styles.coverWrap}>
          {coverSrc ? (
            <img src={coverSrc} alt="" className={styles.coverImg} />
          ) : (
            <div className={styles.coverEmpty} aria-hidden="true" />
          )}
          {isEditing && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onCoverSelect}
                aria-label="Змінити обкладинку"
              />
              <div className={styles.coverActions}>
                <button
                  type="button"
                  className={styles.coverBtn}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <CameraAltIcon fontSize="small" />
                  {coverSrc ? 'Змінити' : 'Додати'}
                </button>
                {coverSrc && (
                  <button
                    type="button"
                    className={styles.coverBtn}
                    onClick={onCoverRemove}
                    aria-label="Прибрати обкладинку"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {isEditing && editForm.errors?.cover && (
        <p className={styles.coverError} role="alert">
          {editForm.errors.cover}
        </p>
      )}
      <div className={styles.avatarWrap}>
        {avatarPreview ? (
          <div className={styles.previewWrap}>
            <img src={avatarPreview} alt="Перегляд нового аватара" className={styles.avatarImg} />
            <button
              className={styles.avatarRemoveBtn}
              onClick={onAvatarRemove}
              type="button"
              aria-label="Скасувати вибір аватара"
              title="Скасувати вибір аватара"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        ) : avatarSrc && !isEditing ? (
          <button
            type="button"
            className={styles.avatarViewBtn}
            onClick={() => setLightbox(true)}
            aria-label="Переглянути аватар у повному розмірі"
            title="Переглянути аватар"
          >
            <UserAvatar user={profile} size="xl" />
          </button>
        ) : (
          <UserAvatar user={profile} size="xl" />
        )}

        {isEditing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.avatarFileInput}
              onChange={onAvatarSelect}
              aria-label="Змінити аватар"
            />
            <button
              className={styles.avatarEditOverlay}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              aria-label="Змінити аватар"
            >
              <CameraAltIcon fontSize="small" />
              <span className={styles.avatarEditLabel}>Змінити</span>
            </button>
          </>
        )}
        {isEditing && editForm.errors?.avatar && (
          <p className={styles.avatarError} role="alert">
            {editForm.errors.avatar}
          </p>
        )}
      </div>

      <div className={styles.info}>
        {isEditing ? (
          <div
            className={sharedStyles.formFields}
            style={{
              '--dialog-outline': '#B9B4A8',
              '--dialog-bg': '#ffffff',
              '--dialog-ink': '#2E2B27',
              '--dialog-muted': 'rgba(46, 43, 39, 0.55)',
              '--accent': '#4E4A44',
            }}
          >
            <TextField
              id="profile-username"
              label="Ім'я користувача"
              fullWidth
              size="small"
              value={editForm.username}
              onChange={(e) => onEditChange('username', e.target.value)}
              error={!!editForm.errors?.username}
              helperText={editForm.errors?.username}
            />
            <TextField
              id="profile-display-name"
              label="Відображуване ім'я"
              fullWidth
              size="small"
              value={editForm.display_name}
              onChange={(e) => onEditChange('display_name', e.target.value)}
              placeholder="Як вас називати?"
              error={!!editForm.errors?.display_name}
              helperText={editForm.errors?.display_name}
            />
            <TextField
              id="profile-bio"
              label="Про себе"
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              value={editForm.bio}
              onChange={(e) => onEditChange('bio', e.target.value)}
              placeholder="Розкажіть про себе..."
              error={!!editForm.errors?.bio}
              helperText={editForm.errors?.bio}
            />
          </div>
        ) : (
          <>
            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>{displayName}</h1>
              {isOwnProfile && <span className={styles.badge}>Ваш профіль</span>}
            </div>
            <p className={styles.username}>@{profile.username}</p>
            {profile.bio && <p className={styles.bio}>{linkifyBio(profile.bio)}</p>}
          </>
        )}
      </div>

      <div className={styles.actionArea}>
        <button
          type="button"
          className={styles.shareBtn}
          onClick={shareProfile}
          aria-label="Поділитись профілем"
          title="Скопіювати посилання на профіль"
        >
          <LinkIcon fontSize="small" />
        </button>
        {isOwnProfile ? (
          isEditing ? (
            <div className={styles.editActions}>
              <button
                className={styles.cancelBtn}
                onClick={onCancel}
                disabled={savePending}
                type="button"
              >
                <CloseIcon fontSize="small" />
                Скасувати
              </button>
              <button
                className={styles.saveBtn}
                onClick={onSave}
                disabled={savePending || !canSave}
                type="button"
                title={!canSave ? 'Немає змін для збереження' : undefined}
              >
                {savePending ? (
                  <CircularProgress size={16} className={styles.saveSpinner} />
                ) : (
                  <CheckIcon fontSize="small" />
                )}
                Зберегти
              </button>
            </div>
          ) : (
            <button className={styles.editBtn} onClick={actions?.onEdit} type="button">
              <EditIcon fontSize="small" />
              Редагувати профіль
            </button>
          )
        ) : (
          <FriendActionButton friendship={friendship} actions={actions} />
        )}
      </div>

      <Dialog open={lightbox} onClose={() => setLightbox(false)} maxWidth="sm" fullWidth>
        <DialogContent className={styles.lightboxContent}>
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt={`Аватар ${profile.username}`}
              className={styles.lightboxImg}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
