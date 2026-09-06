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

// Тільки читання: редагування живе в шапці профілю (ProfileHeader)
export default function ProfileAbout({ profile, isOwnProfile }) {
  const joinDate = profile.date_joined ? formatDate(profile.date_joined) : null

  return (
    <div className={styles.aboutCard}>
      <h3 className={styles.sectionTitle}>Про користувача</h3>
      <div className={styles.aboutGrid}>
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
      </div>
    </div>
  )
}
