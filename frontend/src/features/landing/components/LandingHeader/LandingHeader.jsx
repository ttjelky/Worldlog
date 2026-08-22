import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingHeader.module.css'

export default function LandingHeader({ onStart }) {
  return (
    <header className={styles.headerWrap}>
      <div className={styles.headerBar}>
        <Logo className={styles.logoImg} />
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Можливості</a>
          <a href="https://github.com/ttjelky/Worldlog" className={styles.navLink} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <button className={styles.ctaBtn} onClick={onStart}>
          Створити світ
        </button>
      </div>
    </header>
  )
}
