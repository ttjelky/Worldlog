import Reveal from '../Reveal/Reveal'
import styles from './HowItWorks.module.css'

const steps = [
  {
    num: '1',
    title: 'Створи світ',
    desc: 'Запусти паспорт для світу за хвилину.',
  },
  {
    num: '2',
    title: 'Додавай учасників і контент',
    desc: 'Гравців, локації, сторінки вікі, задачі та події.',
  },
  {
    num: '3',
    title: 'Документуйте разом',
    desc: 'Запрошуй друзів із ролями редактора чи глядача.',
  },
]

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Reveal>
          <h2 className={styles.heading}>Як це працює</h2>
        </Reveal>

        <div className={styles.steps}>
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 90} className={styles.stepWrap}>
              <div className={styles.step}>
                <div className={styles.numCircle}>{step.num}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
