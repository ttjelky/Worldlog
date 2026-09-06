import { useNavigate } from 'react-router-dom'
import { auth } from '../../api'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Сторінку не знайдено</h1>
        <p className={styles.text}>
          Схоже, такої адреси немає або сторінку видалено.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(auth.isAuthenticated() ? '/app' : '/')}
          >
            На головну
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}
