import { useId, useState } from 'react'
import Collapse from '@mui/material/Collapse'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import styles from './FAQ.module.css'

const faqItems = [
  {
    q: 'Чи це справді безкоштовно?',
    a: 'Так. WorldLog безкоштовний, без реклами та без обмежень. MIT-ліцензія — можеш використовувати і модифікувати.',
  },
  {
    q: 'Чи можна розмістити на своєму сервері?',
    a: 'Так. WorldLog — це Django + React. Можеш розмістити на будь-якому сервері з Docker або без нього.',
  },
  {
    q: 'Чи мої дані в безпеці?',
    a: 'Дані зберігаються на твоєму сервері. Ми не збираємо і не продаємо жодних даних.',
  },
  {
    q: 'WorldLog тільки для Minecraft?',
    a: 'Спочатку для Minecraft/RPG, але будь-який проєкт з локаціями, персонажами та історією підходить.',
  },
  {
    q: 'Скільки гравців можна запросити?',
    a: 'Скільки завгодно. Немає обмежень на кількість учасників або світів.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqQuestion}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.faqQuestionText}>{q}</span>
        <ExpandMoreIcon
          className={`${styles.faqArrow} ${open ? styles.faqArrowOpen : ''}`}
        />
      </button>
      <Collapse in={open}>
        <div id={panelId} className={styles.faqAnswer} role="region">
          <p>{a}</p>
        </div>
      </Collapse>
    </div>
  )
}

export default function FAQ() {
  return (
    <section className={styles.section} id="faq">
      <div className={styles.inner}>
        <h2 className={styles.heading}>Часті запитання</h2>

        <div className={styles.card}>
          {faqItems.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  )
}
