import { useNavigate } from 'react-router-dom'
import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingHeader.module.css'

export default function LandingHeader({ onStart }) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.logoLink} aria-label="WorldLog">
          <Logo className={styles.logoImg} />
        </a>

        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>
            Можливості
          </a>
          <a href="#how-it-works" className={styles.navLink}>
            Як це працює
          </a>
          <a href="#faq" className={styles.navLink}>
            FAQ
          </a>
          <a
            href="https://github.com/ttjelky/Worldlog"
            className={styles.navLink}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className={styles.actions}>
          <button
            className={styles.loginBtn}
            onClick={() => navigate('/login')}
          >
            Увійти
          </button>
          <button
            className={styles.signupBtn}
            onClick={onStart}
          >
            Зареєструватися
          </button>
        </div>
      </div>
    </header>
  )
}
