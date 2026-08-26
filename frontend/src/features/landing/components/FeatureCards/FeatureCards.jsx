import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import styles from './FeatureCards.module.css'

const features = [
  {
    id: 'feature-players',
    title: 'Гравці',
    subtitle: 'Знайомих не забувають',
    text: 'Нікнейми, ролі, аватари та статус кожного учасника. Знай, хто онлайн, хто власник, а хто новенький.',
    Icon: GroupsOutlinedIcon,
    biome: 'dripstone',
    accent: '#B8473A',
    items: [
      { name: 'Steve', role: 'Власник', color: '#B8473A' },
      { name: 'Alex', role: 'Будівельник', color: '#2D9060' },
      { name: 'Notch', role: 'Дослідник', color: '#7B4FC4' },
    ],
  },
  {
    id: 'feature-locations',
    title: 'Локації',
    subtitle: 'Координати під рукою',
    text: 'Бази, ферми, шахти та споруди з точними координатами X/Y/Z, категоріями та скріншотами.',
    Icon: PlaceOutlinedIcon,
    biome: 'lush',
    accent: '#2D9060',
    items: [
      { name: "Дерев'яна база", coords: 'X: 120 Y: 64 Z: -340' },
      { name: 'Залізна шахта', coords: 'X: -55 Y: 32 Z: 780' },
      { name: 'Вежа мага', coords: 'X: 310 Y: 88 Z: 15' },
    ],
  },
  {
    id: 'feature-todos',
    title: 'Todo-лист',
    subtitle: 'Плани під контролем',
    text: 'Задачі з пріоритетами, дедлайнами та станом виконання. Ніколи не забудеш про важливе.',
    Icon: CheckCircleOutlineOutlinedIcon,
    biome: 'cherry',
    accent: '#D04568',
    items: [
      { text: 'Побудувати млин', done: true },
      { text: 'Знайти алмази', done: true },
      { text: 'Збудувати Нідер', done: false },
    ],
  },
  {
    id: 'feature-history',
    title: 'Історія',
    subtitle: 'Хроніка пригод',
    text: 'Важливі події світу впорядковані за датою на часовій шкалі. Кожна перемога — в записах.',
    Icon: TimelineOutlinedIcon,
    biome: 'deepdark',
    accent: '#5A3D9E',
    items: [
      { date: '12 бер', title: 'Заснування бази' },
      { date: '15 бер', title: 'Перший рейд' },
      { date: '20 бер', title: 'Ендер-дракон' },
    ],
  },
]

function FeatureDemo({ feature }) {
  const { id, items, accent } = feature

  if (id === 'feature-players') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardBody}>
          {items.map((p) => (
            <div key={p.name} className={styles.demoRow}>
              <div className={styles.demoAvatar} style={{ background: p.color }}>
                {p.name[0]}
              </div>
              <div className={styles.demoRowText}>
                <span className={styles.demoRowName}>{p.name}</span>
                <span className={styles.demoRowSub}>{p.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === 'feature-locations') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardBody}>
          {items.map((loc) => (
            <div key={loc.name} className={styles.demoRow}>
              <div className={styles.demoLocDot} style={{ background: accent }} />
              <div className={styles.demoRowText}>
                <span className={styles.demoRowName}>{loc.name}</span>
                <span className={styles.demoCoords}>{loc.coords}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === 'feature-todos') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardBody}>
          {items.map((t, i) => (
            <div key={i} className={styles.demoRow}>
              <div
                className={styles.demoCheckbox}
                style={t.done ? { background: accent, borderColor: accent } : {}}
              >
                {t.done && (
                  <svg viewBox="0 0 16 16" fill="none" className={styles.demoCheckSvg}>
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
              <span className={`${styles.demoRowName} ${t.done ? styles.demoDone : ''}`}>
                {t.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === 'feature-history') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardBody}>
          {items.map((e, i) => (
            <div key={i} className={styles.demoRow}>
              <div className={styles.demoTimelineDot} style={{ background: accent }} />
              <div className={styles.demoRowText}>
                <span className={styles.demoRowDate} style={{ color: accent }}>
                  {e.date}
                </span>
                <span className={styles.demoRowName}>{e.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default function FeatureCards() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.sectionInner}>
        <h2 className={styles.sectionTitle}>Все для твого світу</h2>
        <p className={styles.sectionSubtitle}>Чотири розділи, що перетворюють хаос на структуру.</p>

        <div className={styles.featuresList}>
          {features.map((f, i) => (
            <div
              key={f.id}
              id={f.id}
              className={`${styles.featureRow} ${styles[`biome-${f.biome}`]} ${i % 2 !== 0 ? styles.featureRowReversed : ''}`}
            >
              <div className={styles.featureText}>
                <div className={styles.featureIconWrap} style={{ background: f.accent + '18' }}>
                  <f.Icon className={styles.featureIcon} style={{ color: f.accent }} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureSubtitle}>{f.subtitle}</p>
                <p className={styles.featureDesc}>{f.text}</p>
              </div>
              <div className={styles.featureDemo}>
                <FeatureDemo feature={f} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
