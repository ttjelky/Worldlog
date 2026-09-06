import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import styles from './Hero.module.css'

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Squiggle() {
  return (
    <svg
      className={styles.squiggle}
      viewBox="0 0 220 300"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M150 8 C 110 60, 190 90, 150 130 C 120 160, 70 140, 90 110 C 105 88, 150 100, 175 130 C 210 170, 190 230, 230 260"
        stroke="var(--wl-squiggle)"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Hero({ onStart }) {
  return (
    <section className={styles.heroSection} id="top">
      <div className={styles.heroGrid}>
        <div className={styles.heroCardLeft}>
          <Squiggle />
          <p className={styles.eyebrow}>WorldLog by DiJital</p>
          <h1 className={styles.heroTitle}>
            Керуй
            <br />
            своїми світами
          </h1>
          <div className={styles.heroButtons}>
            <button type="button" onClick={onStart} className={styles.heroCta}>
              Розпочати
            </button>
            <button
              type="button"
              onClick={() => scrollTo('moments')}
              className={styles.heroRound}
              aria-label="Гортай до можливостей"
            >
              <ArrowDownwardIcon />
            </button>
          </div>
        </div>
        <div className={styles.heroCardRight} aria-hidden="true" />
      </div>
    </section>
  )
}
