import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import styles from './FeatureGrid.module.css'

const features = [
  {
    title: 'Вікі-сторінки',
    desc: 'Локації, персонажі, фракції, предмети та події. Все структуровано за типами.',
    Icon: MenuBookOutlinedIcon,
    accent: '#5C63E0',
  },
  {
    title: 'Часова шкала',
    desc: 'Важливі події світу впорядковані за датою. Кожна перемога — в записах.',
    Icon: TimelineOutlinedIcon,
    accent: '#2E7D53',
  },
  {
    title: 'Гравці',
    desc: 'Нікнейми, ролі та статус кожного учасника. Знай, хто власник, а хто новенький.',
    Icon: GroupsOutlinedIcon,
    accent: '#B85A47',
  },
  {
    title: 'Локації',
    desc: 'Бази, ферми та шахти з координатами X/Y/Z, категоріями та скріншотами.',
    Icon: PlaceOutlinedIcon,
    accent: '#7a52b0',
  },
  {
    title: 'Задачі',
    desc: 'Пріоритети, дедлайни та стан виконання. Ніколи не забудеш про важливе.',
    Icon: CheckCircleOutlineOutlinedIcon,
    accent: '#2E7A67',
  },
  {
    title: 'Нотатки',
    desc: 'Вільні нотатки з тегами. Ідеї, закладки та будь-які думки про світ.',
    Icon: DescriptionOutlinedIcon,
    accent: '#A63C39',
  },
]

export default function FeatureGrid() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.inner}>
        <h2 className={styles.heading}>Все для твого світу</h2>

        <div className={styles.grid}>
          {features.map((f) => (
            <div
              key={f.title}
              className={styles.card}
              style={{ '--card-accent': f.accent }}
            >
              <div className={styles.iconContainer}>
                <f.Icon className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
