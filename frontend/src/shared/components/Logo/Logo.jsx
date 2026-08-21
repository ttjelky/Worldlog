import styles from './Logo.module.css'

export default function Logo({ onClick }) {
  const rootClass = onClick ? `${styles.root} ${styles.rootInteractive}` : styles.root

  return (
    <div
      className={rootClass}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img src="/worldlog-logo.png" alt="WorldLog" className={styles.logoImg} />
    </div>
  )
}
