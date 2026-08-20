import { Button } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import styles from './Hero.module.css'

export default function Hero({ onStart }) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroInner}>
        <span className={styles.overline}>WorldLog · by DiJital</span>
        <h1 className={styles.heroTitle}>
          ДОКУМЕНТУЙ СВІТИ.
          <br />
          <span className={styles.heroTitleAccent}>ЗБЕРІГАЙ ІСТОРІЮ</span>
        </h1>

        <div className={styles.heroGrid}>
          {/* Left: mockup */}
          <div className={styles.mockupPanel}>
            <div className={styles.mockupCard}>
              <div className={styles.mockupDots}>
                <div className={`${styles.mockupDot} ${styles.mockupDotRed}`} />
                <div className={`${styles.mockupDot} ${styles.mockupDotYellow}`} />
                <div className={`${styles.mockupDot} ${styles.mockupDotGreen}`} />
              </div>
              <div className={styles.mockupGrid}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.mockupRow}>
                    <div
                      className={styles.mockupRowDot}
                      style={{
                        background:
                          i === 0 ? 'var(--color-primary)' : 'var(--color-secondary-light)',
                      }}
                    />
                    <div className={styles.mockupRowBar} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: text panel */}
          <div className={styles.textPanel}>
            <span className={styles.panelOverline}>Для тих, хто будує</span>
            <h2 className={styles.panelTitle}>Паспорт твого Minecraft-світу</h2>
            <p className={styles.description}>
              WorldLog допомагає задокументувати все, що відбувається у світі: гравців, локації,
              плани й історію — від першого блоку до останнього рейду.
            </p>
            <div>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                endIcon={<ArrowForwardIcon />}
                onClick={onStart}
              >
                Створити паспорт світу
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
