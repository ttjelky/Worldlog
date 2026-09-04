import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import styles from './FinalCTA.module.css'

export default function FinalCTA({ onStart }) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.card}>
          <h2 className={styles.heading}>Створи паспорт для свого світу</h2>
          <p className={styles.desc}>
            Безкоштовно, без реклами, за хвилину. Приєднуйся до гравців, які документують свої
            пригоди.
          </p>
          <button onClick={onStart} className={styles.ctaBtn}>
            Створити перший світ
            <ArrowForwardIcon style={{ fontSize: 18, marginLeft: 4 }} />
          </button>
        </div>
      </div>
    </section>
  )
}
