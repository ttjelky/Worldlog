import styles from './Differentiators.module.css'

const items = [
  {
    title: 'Зроблено для світів',
    desc: 'Не загальний вікі-редактор. Кожна функція — для Minecraft та RPG світів: координати, теми, типи сторінок.',
    variant: 'primary',
  },
  {
    title: 'Спільна документація',
    desc: 'Запрошуй гравців, давай ролі власника, редактора чи глядача. Документуйте історію разом.',
    variant: 'secondary',
  },
  {
    title: 'Безкоштовно і відкрито',
    desc: 'MIT-ліцензія, без реклами, без обмежень. Використовуй, хости на своєму сервері, модифікуй.',
    variant: 'primary',
  },
  {
    title: 'Теми та структура',
    desc: 'Кожен світ отримує свою тему. Сторінки, проекти, задачі, нотатки — все структуровано.',
    variant: 'secondary',
  },
]

export default function Differentiators() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Чому WorldLog</h2>

        <div className={styles.grid}>
          {items.map((item) => (
            <div
              key={item.title}
              className={`${styles.item} ${styles[item.variant]}`}
            >
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.itemDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
