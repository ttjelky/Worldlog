import { useNavigate } from 'react-router-dom'
import styles from './LandingHeader.module.css'

const links = [
  ['Про нас', '#top'],
  ['Функціонал', '#functionality'],
  ['FAQ', '#faq'],
  ['Контакти', '#contact'],
]

export default function LandingHeader({ onStart }) {
  const navigate = useNavigate()

  return (
    <div className={styles.barWrap}>
      <header className={styles.bar}>
        <a href="#top" className={styles.logo} aria-label="WorldLog — на початок">
          WL
        </a>

        <nav className={styles.nav} aria-label="Навігація">
          {links.map(([label, href]) => (
            <a key={href} href={href} className={styles.navLink}>
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.signupBtn} onClick={onStart}>
            Зареєструватися
          </button>
          <button
            type="button"
            className={styles.signinBtn}
            onClick={() => navigate('/login')}
          >
            Увійти
          </button>
        </div>
      </header>
    </div>
  )
}
