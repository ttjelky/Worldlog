import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import styles from './FeatureCards.module.css'

const features = [
  {
    title: 'Гравці',
    text: 'Нікнейми, ролі та аватари кожного учасника твого світу.',
    Icon: GroupsOutlinedIcon,
  },
  {
    title: 'Локації',
    text: 'Бази, ферми, шахти та споруди з координатами і скріншотами.',
    Icon: PlaceOutlinedIcon,
  },
  {
    title: 'Todo-лист',
    text: 'Плани з пріоритетами, дедлайнами і станом виконання.',
    Icon: CheckCircleOutlineOutlinedIcon,
  },
  {
    title: 'Історія',
    text: 'Важливі події світу впорядковані за датою на часовій шкалі.',
    Icon: TimelineOutlinedIcon,
  },
]

export default function FeatureCards() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <h2 className={styles.title}>Можливості</h2>
        <div className={styles.grid}>
          {features.map((f) => (
            <div key={f.title} className={styles.card}>
              <f.Icon className={styles.iconSvg} />
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardText}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
