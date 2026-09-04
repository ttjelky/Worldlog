import GitHubIcon from '@mui/icons-material/GitHub'
import styles from './TrustBar.module.css'

export default function TrustBar() {
  return (
    <section className={styles.trustBar}>
      <div className={styles.inner}>
        <div className={styles.item}>
          <GitHubIcon className={styles.icon} />
          <span>
            <a
              href="https://github.com/ttjelky/Worldlog"
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              Open-source
            </a>{' '}
            (MIT)
          </span>
        </div>

        <span className={styles.divider} />

        <div className={styles.item}>
          <span>Безкоштовно, без реклами</span>
        </div>

        <span className={styles.divider} />

        <div className={styles.item}>
          <span>Зроблено </span>
          <img src="/dijital-logo.png" alt="DiJital" height={14} className={styles.dijitalImg} />
        </div>
      </div>
    </section>
  )
}
