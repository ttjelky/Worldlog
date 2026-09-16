import { useNavigate } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import styles from './ProfileQuickActions.module.css'

/**
 * Швидкі дії на своєму профілі.
 */
export default function ProfileQuickActions() {
  const navigate = useNavigate()

  return (
    <div className={styles.row} aria-label="Швидкі дії">
      <button type="button" className={styles.action} onClick={() => navigate('/app/worlds')}>
        <AddIcon fontSize="small" />
        Новий світ
      </button>
      <button type="button" className={styles.action} onClick={() => navigate('/app/friends')}>
        <PersonSearchIcon fontSize="small" />
        Знайти друзів
      </button>
    </div>
  )
}
