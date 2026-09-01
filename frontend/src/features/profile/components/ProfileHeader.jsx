import { useRef } from 'react'
import { TextField } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import CircularProgress from '@mui/material/CircularProgress'
import UserAvatar from '../../../shared/components/UserAvatar/UserAvatar'
import FriendActionButton from './FriendActionButton'
import styles from './ProfileHeader.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
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
  avatarPreview,
  onAvatarSelect,
}) {
  const displayName = profile.display_name || profile.username
  const joinDate = profile.date_joined ? formatDate(profile.date_joined) : null
  const fileInputRef = useRef(null)

  return (
    <div className={`${styles.header} ${isEditing ? styles.headerEditing : ''}`}>
      <div className={styles.avatarWrap}>
        {avatarPreview ? (
          <img src={avatarPreview} alt="Avatar preview" className={styles.avatarImg} />
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
      </div>

      <div className={styles.info}>
        {isEditing ? (
          <div className={styles.editFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Ім'я користувача</label>
              <TextField
                fullWidth
                size="small"
                value={editForm.username}
                onChange={(e) => onEditChange('username', e.target.value)}
                className={styles.editInput}
                error={!!editForm.errors?.username}
                helperText={editForm.errors?.username}
                slotProps={{
                  input: { className: styles.inputField },
                }}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Відображуване ім'я</label>
              <TextField
                fullWidth
                size="small"
                value={editForm.display_name}
                onChange={(e) => onEditChange('display_name', e.target.value)}
                placeholder="Як вас називати?"
                className={styles.editInput}
                slotProps={{
                  input: { className: styles.inputField },
                }}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Про себе</label>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                value={editForm.bio}
                onChange={(e) => onEditChange('bio', e.target.value)}
                placeholder="Розкажіть про себе..."
                className={styles.editInput}
                slotProps={{
                  input: { className: styles.inputField },
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>{displayName}</h1>
              {isOwnProfile && <span className={styles.badge}>Ваш профіль</span>}
            </div>
            <p className={styles.username}>@{profile.username}</p>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          </>
        )}

        {joinDate && (
          <p className={styles.joinDate}>Приєднався {joinDate}</p>
        )}

        <div className={styles.quickStats}>
          <span className={styles.statItem}>
            {profile.worlds_count ?? 0} світів
          </span>
          <span className={styles.statDot} />
          <span className={styles.statItem}>
            {profile.friends_count ?? 0} друзів
          </span>
        </div>
      </div>

      <div className={styles.actionArea}>
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
                disabled={savePending}
                type="button"
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
          <FriendActionButton
            isOwnProfile={isOwnProfile}
            friendship={friendship}
            actions={actions}
          />
        )}
      </div>
    </div>
  )
}
