import GitHubIcon from '@mui/icons-material/GitHub'
import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingFooter.module.css'

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Logo />
        <span className={styles.copyright}>
          © {new Date().getFullYear()} DiJital. Публічний open-source проєкт.
        </span>
        <a
          className={styles.gitHubBtn}
          href="https://github.com/dijital/worldlog"
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
