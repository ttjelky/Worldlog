import { Button } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import styles from './Hero.module.css'

const featureLinks = [
  { id: 'feature-players', label: 'Гравці', Icon: GroupsOutlinedIcon },
  { id: 'feature-locations', label: 'Локації', Icon: PlaceOutlinedIcon },
  { id: 'feature-todos', label: 'Todo-листи', Icon: CheckCircleOutlineOutlinedIcon },
  { id: 'feature-history', label: 'Історія', Icon: TimelineOutlinedIcon },
]

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
                    ? '#7C83F5'
                    : i === 1
                      ? '#4CAF7D'
                      : '#E57399',
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
          { name: "Дерев'яна база", coords: 'X: 120 · Y: 64 · Z: -340', color: '#7C83F5' },
          { name: 'Залізна шахта', coords: 'X: -55 · Y: 32 · Z: 780', color: '#4CAF7D' },
          { name: 'Вежа мага', coords: 'X: 310 · Y: 88 · Z: 15', color: '#E57399' },
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
                  ? { background: '#7C83F5', borderColor: '#7C83F5' }
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
          { date: '12 бер', title: 'Заснування бази', color: '#7C83F5' },
          { date: '15 бер', title: 'Перший рейд', color: '#E57399' },
          { date: '20 бер', title: 'Ендер-дракон', color: '#4CAF7D' },
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
      <div className={styles.heroCard}>
        <div className={styles.heroBg}>
          <div className={styles.heroGradient} />
          <div className={styles.heroGrain} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroTop}>
            <div className={styles.heroText}>
              <span className={styles.heroBadge}>Паспорт Minecraft-світу</span>
              <h1 className={styles.heroTitle}>
                Документуй
                <br />
                світи
              </h1>
              <p className={styles.heroSubtitle}>
                Паспорт для твого Minecraft-світу. Гравці, локації, плани та історія — все в одному
                місці.
              </p>
              <div className={styles.heroButtons}>
                <Button
                  variant="contained"
                  color="primary"
                  disableElevation
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={onStart}
                  className={styles.heroButtonPrimary}
                >
                  Спробувати
                </Button>
                <Button
                  variant="tonal"
                  color="primary"
                  size="large"
                  endIcon={<ExploreOutlinedIcon />}
                  onClick={() => scrollTo('features')}
                  className={styles.heroButtonSecondary}
                >
                  Дізнатися більше
                </Button>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroCollage}>
                <MockupPlayers />
                <MockupLocations />
                <MockupTodos />
                <MockupTimeline />
              </div>
            </div>
          </div>

          <div className={styles.heroNav}>
            <span className={styles.heroNavLabel}>Перейти до:</span>
            <div className={styles.heroNavPills}>
              {featureLinks.map((f) => (
                <button
                  key={f.id}
                  className={styles.heroNavPill}
                  onClick={() => scrollTo(f.id)}
                >
                  <f.Icon className={styles.heroNavPillIcon} />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
