import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
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
      <div className={styles.icon}>
        <ExploreOutlinedIcon className={styles.iconSvg} />
      </div>
      <div className={styles.textGroup}>
        <div className={styles.brandName}>WorldLog</div>
        <div className={styles.subtext}>by DiJital</div>
      </div>
    </div>
  )
}
