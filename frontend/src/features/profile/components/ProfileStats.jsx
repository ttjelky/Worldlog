import styles from './ProfileStats.module.css'

export default function ProfileStats({ worldsCount = 0, friendsCount = 0 }) {
  return (
    <div className={styles.statsRow}>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{worldsCount}</span>
        <span className={styles.statLabel}>Світів</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{friendsCount}</span>
        <span className={styles.statLabel}>Друзів</span>
      </div>
    </div>
  )
}
