import { Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import styles from '../Dashboard.module.css'

export function AddCardButton({ onClick }) {
  return (
    <Button
      className={`${styles.worldCard} ${styles.addCard}`}
      onClick={onClick}
      sx={{
        '& .MuiTouchRipple-ripple': {
          color: 'rgba(0, 0, 0, 0.18)',
        },
      }}
    >
      <AddIcon className={styles.addIcon} />
      <span className={styles.addText}>Новий світ</span>
    </Button>
  )
}
