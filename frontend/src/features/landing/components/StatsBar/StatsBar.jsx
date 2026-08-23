import styles from './StatsBar.module.css'

const stats = [
  { value: '4', label: 'Розділи світу' },
  { value: '∞', label: 'Локацій та подій' },
  { value: '100%', label: 'Твій паспорт' },
]

export default function StatsBar() {
  return (
    <section className={styles.statsBar}>
      <div className={styles.statsBarInner}>
        {stats.map((s, i) => (
          <div key={s.label} className={styles.statsItem}>
            <div className={styles.statsValue}>{s.value}</div>
            <div className={styles.statsLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
