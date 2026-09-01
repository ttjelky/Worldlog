import { TextField } from '@mui/material'
import styles from './ProfileAbout.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfileAbout({ profile, isOwnProfile, isEditing, editForm, onEditChange }) {
  const joinDate = profile.date_joined ? formatDate(profile.date_joined) : null

  return (
    <div className={`${styles.aboutCard} ${isEditing ? styles.aboutCardEditing : ''}`}>
      <h3 className={styles.sectionTitle}>Про користувача</h3>
      <div className={styles.aboutGrid}>
        {isEditing ? (
          <>
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Ім'я користувача</span>
              <TextField
                fullWidth
                size="small"
                value={editForm.username}
                onChange={(e) => onEditChange('username', e.target.value)}
                error={!!editForm.errors?.username}
                helperText={editForm.errors?.username}
                className={styles.editField}
                slotProps={{ input: { className: styles.inputField } }}
              />
            </div>
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Відображуване ім'я</span>
              <TextField
                fullWidth
                size="small"
                value={editForm.display_name}
                onChange={(e) => onEditChange('display_name', e.target.value)}
                placeholder="Як вас називати?"
                className={styles.editField}
                slotProps={{ input: { className: styles.inputField } }}
              />
            </div>
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Про себе</span>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                value={editForm.bio}
                onChange={(e) => onEditChange('bio', e.target.value)}
                placeholder="Розкажіть про себе..."
                className={styles.editField}
                slotProps={{ input: { className: styles.inputField } }}
              />
            </div>
            {joinDate && (
              <div className={styles.aboutItem}>
                <span className={styles.aboutLabel}>Дата приєднання</span>
                <span className={styles.aboutValue}>{joinDate}</span>
              </div>
            )}
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Світів створено</span>
              <span className={styles.aboutValue}>{profile.worlds_count ?? 0}</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Ім'я користувача</span>
              <span className={styles.aboutValue}>{profile.username}</span>
            </div>
            {isOwnProfile && profile.email && (
              <div className={styles.aboutItem}>
                <span className={styles.aboutLabel}>Email</span>
                <span className={styles.aboutValue}>{profile.email}</span>
              </div>
            )}
            {joinDate && (
              <div className={styles.aboutItem}>
                <span className={styles.aboutLabel}>Дата приєднання</span>
                <span className={styles.aboutValue}>{joinDate}</span>
              </div>
            )}
            <div className={styles.aboutItem}>
              <span className={styles.aboutLabel}>Світів створено</span>
              <span className={styles.aboutValue}>{profile.worlds_count ?? 0}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
