import GitHubIcon from '@mui/icons-material/GitHub'
import styles from './LandingFooter.module.css'

export default function LandingFooter() {
  return (
    <footer className={styles.footer} id="contact">
      <div className={styles.footerInner}>
        <a href="#top" className={styles.brand} aria-label="WorldLog — на початок">
          <span className={styles.wordmark}>WL</span>
          <img src="/dijital-logo.png" alt="DiJital" height={20} className={styles.dijitalImg} />
        </a>
        <span className={styles.copyright}>
          &copy; {new Date().getFullYear()} DiJital. Публічний open-source проєкт.
        </span>
        <a
          className={styles.gitHubBtn}
          href="https://github.com/ttjelky/Worldlog"
          target="_blank"
          rel="noreferrer"
        >
          <GitHubIcon fontSize="small" />
          GitHub
        </a>
      </div>
    </footer>
  )
}
