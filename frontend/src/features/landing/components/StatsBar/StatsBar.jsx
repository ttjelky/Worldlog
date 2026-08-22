import styles from './StatsBar.module.css'

const stats = [
  { value: '4', label: 'Розділи світу', desc: 'Гравці, локації, todo, історія' },
  { value: '∞', label: 'Локацій та подій', desc: 'Без обмежень' },
  { value: '100%', label: 'Твій паспорт', desc: 'Повний контроль' },
]

export default function StatsBar() {
  return (
    <section className={styles.statsBar}>
      <div className={styles.statsBarInner}>
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statsItem}>
              <div className={styles.statsValue}>{s.value}</div>
              <div className={styles.statsLabel}>{s.label}</div>
              <div className={styles.statsDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
