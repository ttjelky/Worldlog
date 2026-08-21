import styles from './StatsBar.module.css'

const stats = [
  { value: '04', label: 'Розділи світу' },
  { value: '∞', label: 'Локацій та подій' },
  { value: '100%', label: 'Твій паспорт' },
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
