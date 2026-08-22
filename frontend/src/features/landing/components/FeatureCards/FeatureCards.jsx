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
    color: '#7C83F5',
    items: [
      { name: 'Steve', role: 'Власник', color: '#7C83F5' },
      { name: 'Alex', role: 'Будівельник', color: '#4CAF7D' },
      { name: 'Notch', role: 'Дослідник', color: '#E57399' },
    ],
  },
  {
    id: 'feature-locations',
    title: 'Локації',
    subtitle: 'Координати під рукою',
    text: 'Бази, ферми, шахти та споруди з точними координатами X/Y/Z, категоріями та скріншотами.',
    Icon: PlaceOutlinedIcon,
    color: '#4CAF7D',
    items: [
      { name: "Дерев'яна база", coords: 'X: 120 · Y: 64 · Z: -340' },
      { name: 'Залізна шахта', coords: 'X: -55 · Y: 32 · Z: 780' },
      { name: 'Вежа мага', coords: 'X: 310 · Y: 88 · Z: 15' },
    ],
  },
  {
    id: 'feature-todos',
    title: 'Todo-лист',
    subtitle: 'Плани під контролем',
    text: 'Задачі з пріоритетами, дедлайнами та станом виконання. Ніколи не забудеш про важливе.',
    Icon: CheckCircleOutlineOutlinedIcon,
    color: '#E57399',
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
    color: '#F5A623',
    items: [
      { date: '12 бер', title: 'Заснування бази', color: '#7C83F5' },
      { date: '15 бер', title: 'Перший рейд', color: '#E57399' },
      { date: '20 бер', title: 'Ендер-дракон', color: '#4CAF7D' },
    ],
  },
]

function FeatureDemo({ feature }) {
  const { id, title, items, color } = feature

  if (id === 'feature-players') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardHeader}>
          <div className={styles.demoDots}>
            <span className={`${styles.dot} ${styles.dotR}`} />
            <span className={`${styles.dot} ${styles.dotY}`} />
            <span className={`${styles.dot} ${styles.dotG}`} />
          </div>
        </div>
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
              <span className={styles.demoOnlineDot} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === 'feature-locations') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardHeader}>
          <div className={styles.demoDots}>
            <span className={`${styles.dot} ${styles.dotR}`} />
            <span className={`${styles.dot} ${styles.dotY}`} />
            <span className={`${styles.dot} ${styles.dotG}`} />
          </div>
        </div>
        <div className={styles.demoCardBody}>
          {items.map((loc) => (
            <div key={loc.name} className={styles.demoRow}>
              <div className={styles.demoLocDot} style={{ background: color }} />
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
        <div className={styles.demoCardHeader}>
          <div className={styles.demoDots}>
            <span className={`${styles.dot} ${styles.dotR}`} />
            <span className={`${styles.dot} ${styles.dotY}`} />
            <span className={`${styles.dot} ${styles.dotG}`} />
          </div>
        </div>
        <div className={styles.demoCardBody}>
          {items.map((t, i) => (
            <div key={i} className={styles.demoRow}>
              <div
                className={styles.demoCheckbox}
                style={t.done ? { background: color, borderColor: color } : {}}
              >
                {t.done && (
                  <svg viewBox="0 0 16 16" fill="none" className={styles.demoCheckSvg}>
                    <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={`${styles.demoRowName} ${t.done ? styles.demoDone : ''}`}>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === 'feature-history') {
    return (
      <div className={styles.demoCard}>
        <div className={styles.demoCardHeader}>
          <div className={styles.demoDots}>
            <span className={`${styles.dot} ${styles.dotR}`} />
            <span className={`${styles.dot} ${styles.dotY}`} />
            <span className={`${styles.dot} ${styles.dotG}`} />
          </div>
        </div>
        <div className={styles.demoCardBody}>
          {items.map((e, i) => (
            <div key={i} className={styles.demoRow}>
              <div className={styles.demoTimelineDot} style={{ background: e.color }} />
              <div className={styles.demoRowText}>
                <span className={styles.demoRowDate} style={{ color: e.color }}>{e.date}</span>
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
        <span className={styles.sectionBadge}>Можливості</span>
        <h2 className={styles.sectionTitle}>Все для твого світу</h2>
        <p className={styles.sectionSubtitle}>
          Чотири розділи, що перетворюють хаос на структуру. Кожен — зі зручним інтерфейсом.
        </p>

        <div className={styles.featuresList}>
          {features.map((f, i) => (
            <div
              key={f.id}
              id={f.id}
              className={`${styles.featureRow} ${i % 2 !== 0 ? styles.featureRowReversed : ''}`}
            >
              <div className={styles.featureText}>
                <div className={styles.featureIconWrap} style={{ background: f.color + '14' }}>
                  <f.Icon className={styles.featureIcon} style={{ color: f.color }} />
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
