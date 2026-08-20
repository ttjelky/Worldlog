import styles from './StatsBar.module.css'

const stats = [
  { value: '04', label: 'Розділи світу' },
  { value: '∞', label: 'Локацій та подій' },
  { value: '100%', label: 'Твій паспорт' },
]

export default function StatsBar() {
  return (
    <section className={styles.strip}>
      <div className={styles.stripInner}>
        <div className={styles.stripGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stripItem}>
              <div className={styles.stripValue}>{s.value}</div>
              <div className={styles.stripLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
