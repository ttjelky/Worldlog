import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import styles from './FeatureCards.module.css'

const features = [
  {
    title: 'Гравці',
    text: 'Склад команди: нікнейми, ролі та аватари кожного учасника вашого світу.',
    Icon: GroupsOutlinedIcon,
  },
  {
    title: 'Локації',
    text: 'Бази, ферми, шахти та споруди з координатами X/Y/Z і галереєю скріншотів.',
    Icon: PlaceOutlinedIcon,
  },
  {
    title: 'Todo-лист',
    text: 'Плани та цілі: пріоритети, дедлайни і стан виконання — все під рукою.',
    Icon: CheckCircleOutlineOutlinedIcon,
  },
  {
    title: 'Історія-роадмапа',
    text: 'Кожна важлива подія світу впорядкована за датою на зрозумілій часовій шкалі.',
    Icon: TimelineOutlinedIcon,
  },
]

export default function FeatureCards() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <span className={styles.overline}>Можливості</span>
        <h2 className={styles.title}>Все для літопису світу</h2>
        <div className={styles.grid}>
          {features.map((f) => (
            <div key={f.title} className={styles.card}>
              <div className={styles.iconBox}>
                <f.Icon className={styles.iconSvg} />
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardText}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
