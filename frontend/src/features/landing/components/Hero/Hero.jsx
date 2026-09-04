import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import DiJitalWordmark from '../../../../shared/components/DiJitalWordmark/DiJitalWordmark'
import styles from './Hero.module.css'

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Hero({ onStart }) {
  return (
    <section className={styles.heroSection} id="top">
      <div className={styles.heroGrid}>
        <div className={styles.heroCardLeft}>
          <h1 className={styles.heroTitle}>Ваші світи. <br/> В одному місці.</h1>
          <p className={styles.heroSubtitle}>
            Паспорт для твого Minecraft та RPG світу. Гравці, локації, вікі та історія — все в
            одному місці.
          </p>
          <div className={styles.heroButtons}>
            <button
              onClick={onStart}
              className={styles.heroCtaPrimary}
            >
              Створити перший світ
              <ArrowForwardIcon style={{ fontSize: 18, marginLeft: 4 }} />
            </button>
          </div>
        </div>
        <div className={styles.heroCardRight} />
      </div>
    </section>
  )
}