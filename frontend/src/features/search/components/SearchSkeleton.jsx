import styles from './SearchSkeleton.module.css'

function SkeletonBlock({ className }) {
  return <div className={`${styles.skeleton} ${className || ''}`} />
}

export default function SearchSkeleton() {
  return (
    <div className={styles.container}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.card}>
          <SkeletonBlock className={styles.avatarSkeleton} />
          <div className={styles.infoSkeleton}>
            <SkeletonBlock className={styles.nameSkeleton} />
            <SkeletonBlock className={styles.subSkeleton} />
          </div>
          <SkeletonBlock className={styles.btnSkeleton} />
        </div>
      ))}
    </div>
  )
}
