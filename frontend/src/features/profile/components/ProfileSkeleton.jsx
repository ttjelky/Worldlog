import styles from './ProfileSkeleton.module.css'

function SkeletonBlock({ className }) {
  return <div className={`${styles.skeleton} ${className || ''}`} />
}

export default function ProfileSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <SkeletonBlock className={styles.avatarSkeleton} />
        <div className={styles.headerInfo}>
          <SkeletonBlock className={styles.nameSkeleton} />
          <SkeletonBlock className={styles.dateSkeleton} />
          <div className={styles.statsRow}>
            <SkeletonBlock className={styles.statSkeleton} />
            <SkeletonBlock className={styles.statSkeleton} />
          </div>
        </div>
        <SkeletonBlock className={styles.btnSkeleton} />
      </div>

      <div className={styles.statsCards}>
        <SkeletonBlock className={styles.statCardSkeleton} />
        <SkeletonBlock className={styles.statCardSkeleton} />
      </div>

      <SkeletonBlock className={styles.aboutSkeleton} />
    </div>
  )
}
