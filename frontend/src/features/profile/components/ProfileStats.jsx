import styles from './ProfileStats.module.css'

export default function ProfileStats({ worldsCount = 0, friendsCount = 0, onWorldsClick, onFriendsClick }) {
  return (
    <div className={styles.statsRow}>
      <button
        type="button"
        className={`${styles.statCard} ${styles.statClickable}`}
        onClick={onWorldsClick}
        aria-label={`Перейти до світів: ${worldsCount}`}
      >
        <span className={styles.statValue}>{worldsCount}</span>
        <span className={styles.statLabel}>Світів</span>
      </button>
      <button
        type="button"
        className={`${styles.statCard} ${styles.statClickable}`}
        onClick={onFriendsClick}
        aria-label={`Перейти до друзів: ${friendsCount}`}
      >
        <span className={styles.statValue}>{friendsCount}</span>
        <span className={styles.statLabel}>Друзів</span>
      </button>
    </div>
  )
}
