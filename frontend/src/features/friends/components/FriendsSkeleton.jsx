import styles from './FriendsSkeleton.module.css'

function SkeletonBlock({ className }) {
  return <div className={`${styles.skeleton} ${className || ''}`} />
}

export default function FriendsSkeleton() {
  return (
    <div className={styles.container}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.card}>
          <SkeletonBlock className={styles.avatarSkeleton} />
          <div className={styles.infoSkeleton}>
            <SkeletonBlock className={styles.nameSkeleton} />
            <SkeletonBlock className={styles.statusSkeleton} />
          </div>
        </div>
      ))}
    </div>
  )
}
