import { Button } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import styles from './Hero.module.css'

function MockupPlayers() {
  return (
    <div className={`${styles.collageCard} ${styles.collagePlayers}`}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.mockupCardTitle}>Гравці</div>
        {['Steve', 'Alex', 'Notch'].map((name, i) => (
          <div key={name} className={styles.mockupRow}>
            <div
              className={styles.mockupAvatar}
              style={{
                background:
                  i === 0
                    ? 'var(--color-primary)'
                    : i === 1
                      ? 'var(--color-secondary)'
                      : 'var(--color-accent-pink)',
              }}
            />
            <div className={styles.mockupRowText}>
              <div className={styles.mockupRowName}>{name}</div>
              <div className={styles.mockupRowSub}>{i === 0 ? 'Власник' : 'Учасник'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupLocations() {
  return (
    <div className={`${styles.collageCard} ${styles.collageLocations}`}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.mockupCardTitle}>Локації</div>
        {[
          {
            name: "Дерев'яна база",
            coords: 'X: 120 · Y: 64 · Z: -340',
            color: 'var(--color-primary)',
          },
          {
            name: 'Залізна шахта',
            coords: 'X: -55 · Y: 32 · Z: 780',
            color: 'var(--color-secondary)',
          },
          {
            name: 'Вежа мага',
            coords: 'X: 310 · Y: 88 · Z: 15',
            color: 'var(--color-accent-pink)',
          },
        ].map((loc) => (
          <div key={loc.name} className={styles.mockupRow}>
            <div className={styles.mockupLocDot} style={{ background: loc.color }} />
            <div className={styles.mockupRowText}>
              <div className={styles.mockupRowName}>{loc.name}</div>
              <div className={styles.mockupRowCoords}>{loc.coords}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupTodos() {
  return (
    <div className={`${styles.collageCard} ${styles.collageTodos}`}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.mockupCardTitle}>Todo-лист</div>
        {[
          { text: 'Побудувати млин', done: true },
          { text: 'Знайти алмази', done: true },
          { text: 'Збудувати Нідер', done: false },
          { text: 'Зібрати еліту', done: false },
        ].map((t, i) => (
          <div key={i} className={styles.mockupRow}>
            <div
              className={styles.mockupCheckbox}
              style={
                t.done
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                  : {}
              }
            >
              {t.done && (
                <svg viewBox="0 0 16 16" fill="none" className={styles.mockupCheckSvg}>
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className={`${styles.mockupRowName} ${t.done ? styles.mockupTodoDone : ''}`}>
              {t.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupTimeline() {
  return (
    <div className={`${styles.collageCard} ${styles.collageTimeline}`}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.mockupCardTitle}>Історія</div>
        {[
          { date: '12 бер', title: 'Заснування бази', color: 'var(--color-primary)' },
          { date: '15 бер', title: 'Перший рейд', color: 'var(--color-accent-pink)' },
          { date: '20 бер', title: 'Ендер-дракон', color: 'var(--color-secondary)' },
        ].map((e, i) => (
          <div key={i} className={styles.mockupRow}>
            <div className={styles.mockupTimelineNode} style={{ background: e.color }} />
            <div className={styles.mockupRowText}>
              <div className={styles.mockupRowDate} style={{ color: e.color }}>
                {e.date}
              </div>
              <div className={styles.mockupRowName}>{e.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Hero({ onStart }) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroInner}>
        <div className={styles.heroGrid}>
          {/* Left: text */}
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Документуй
              <br />
              світи
            </h1>
            <p className={styles.heroSubtitle}>
              Паспорт для твого Minecraft-світу. Гравці, локації, плани та історія — все в одному
              місці.
            </p>
            <Button
              variant="contained"
              color="primary"
              disableElevation
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={onStart}
              className={styles.heroButton}
            >
              Спробувати
            </Button>
          </div>

          {/* Right: collage */}
          <div className={styles.heroCollage}>
            <MockupPlayers />
            <MockupLocations />
            <MockupTodos />
            <MockupTimeline />
          </div>
        </div>
      </div>
    </section>
  )
}
