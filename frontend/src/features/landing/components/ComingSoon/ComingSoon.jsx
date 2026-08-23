import { Button } from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import styles from './ComingSoon.module.css'

export default function ComingSoon({ onStart }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.iconWrap}>
              <GroupsOutlinedIcon className={styles.icon} />
            </div>
            <h2 className={styles.title}>Скоро: спільні світи</h2>
            <p className={styles.description}>
              Запрошуй друзів у світ, давай ролі редактора чи глядача і документуйте історію разом.
            </p>
            <Button variant="contained" onClick={onStart} className={styles.ctaBtn}>
              Взяти участь
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
