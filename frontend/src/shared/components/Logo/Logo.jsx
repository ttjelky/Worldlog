import styles from './Logo.module.css'

export default function Logo({ onClick, variant }) {
  const rootClass = onClick ? `${styles.root} ${styles.rootInteractive}` : styles.root
  const imgClass = variant === 'dark' ? `${styles.logoImg} ${styles.logoImgDark}` : styles.logoImg

  return (
    <div
      className={rootClass}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img src="/worldlog-logo.png" alt="WorldLog" className={imgClass} />
    </div>
  )
}
