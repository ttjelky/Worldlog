import GitHubIcon from '@mui/icons-material/GitHub'
import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingFooter.module.css'

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <Logo />
          <img src="/dijital-logo.png" alt="DiJital" height={20} className={styles.dijitalImg} />
        </div>
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
