import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import styles from './CaptureMoments.module.css'

const cards = [
  {
    title: 'Вікі-сторінки',
    desc: 'Персонажі, локації, фракції та події — усе структуровано за типами.',
    Icon: MenuBookOutlinedIcon,
  },
  {
    title: 'Локації світу',
    desc: 'Бази, ферми й шахти з координатами, категоріями та скріншотами.',
    Icon: PlaceOutlinedIcon,
  },
  {
    title: 'Історія пригод',
    desc: 'Хронологія подій, задачі та прогрес усієї команди.',
    Icon: TimelineOutlinedIcon,
  },
]

export default function CaptureMoments() {
  return (
    <section className={styles.section} id="moments">
      <div className={styles.inner}>
        <h2 className={styles.heading}>Перетвори свій світ на окрему гру</h2>
        <div className={styles.grid}>
          {cards.map((c) => (
            <div key={c.title} className={styles.card}>
              <div className={styles.iconBadge}>
                <c.Icon className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>{c.title}</h3>
              <p className={styles.cardDesc}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
