import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PlaceIcon from '@mui/icons-material/Place'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PeopleIcon from '@mui/icons-material/People'
import EventIcon from '@mui/icons-material/Event'
import ArticleIcon from '@mui/icons-material/Article'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CollectionsIcon from '@mui/icons-material/Collections'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import InfoIcon from '@mui/icons-material/Info'
import PhotoIcon from '@mui/icons-material/Photo'
import sharedStyles from '../shared/section.module.css'
import styles from './CardsMenu.module.css'

const CARD_DEFS = [
  {
    id: 'info',
    name: 'Інфо про світ',
    desc: 'Назва, опис, сід та основна статистика світу',
    icon: InfoIcon,
    locked: true,
  },
  {
    id: 'cover',
    name: 'Обкладинка',
    desc: 'Головне зображення світу',
    icon: PhotoIcon,
    locked: true,
  },
  {
    id: 'players',
    name: 'Гравці',
    desc: 'Список гравців світу з аватарами та ролями',
    icon: PeopleIcon,
  },
  {
    id: 'locations',
    name: 'Локації',
    desc: 'Зберігай локації світу з координатами, фото та описом',
    icon: PlaceIcon,
  },
  {
    id: 'todos',
    name: 'Todo-лист',
    desc: 'Завдання та плани з пріоритетами та статусом виконання',
    icon: AssignmentIcon,
  },
  {
    id: 'history',
    name: 'Історія',
    desc: 'Хроніка подій світу у вигляді таймлайну',
    icon: EventIcon,
  },
  {
    id: 'wiki',
    name: 'World Wiki',
    desc: 'Повноцінна вікі-система для персонажів, фракцій та лора',
    icon: MenuBookIcon,
  },
  {
    id: 'notes',
    name: 'Нотатки',
    desc: 'Прості нотатки та ідеї з тегами',
    icon: ArticleIcon,
  },
  {
    id: 'projects',
    name: 'Проєкти',
    desc: 'Великі цілі з автоматичним прогресом на основі задач',
    icon: TrendingUpIcon,
  },
  {
    id: 'planner',
    name: 'Планер',
    desc: 'Планування майбутніх подіб за датами',
    icon: CalendarMonthIcon,
  },
  {
    id: 'bookmarks',
    name: 'Закладки',
    desc: 'Збереження корисних посилань та референсів',
    icon: BookmarkIcon,
  },
  {
    id: 'ideas',
    name: 'Ідеї',
    desc: 'Місце для ідей з можливістю перетворити на проєкт',
    icon: LightbulbIcon,
  },
  {
    id: 'inspiration',
    name: 'Натхнення',
    desc: 'Moodboard-картка для зображень-референсів',
    icon: CollectionsIcon,
  },
  {
    id: 'progress',
    name: 'Прогрес',
    desc: 'Статистика твого WorldLog: кількість локацій, Wiki-сторінок, задач тощо',
    icon: CheckCircleIcon,
  },
]

export default function CardsMenu({ open, onClose, layout, onToggle }) {
  const { cards } = layout

  const getHidden = (id) => {
    const card = cards.find((c) => c.id === id)
    return card?.hidden ?? false
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
    >
      <DialogTitle className={styles.dialogTitle}>
        Картки
        <IconButton className={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className={styles.dialogContent}>
        <div className={styles.cardList}>
          {CARD_DEFS.map((def) => {
            const Icon = def.icon
            const hidden = getHidden(def.id)
            return (
              <div
                key={def.id}
                className={`${styles.cardRow} ${hidden ? styles.cardRowHidden : ''}`}
              >
                <div className={styles.cardIcon}>
                  <Icon fontSize="small" />
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{def.name}</div>
                  <div className={styles.cardDesc}>{def.desc}</div>
                </div>
                <Switch
                  checked={!hidden}
                  disabled={def.locked}
                  onChange={() => onToggle(def.id)}
                  size="small"
                  className={styles.cardToggle}
                />
              </div>
            )
          })}
        </div>
      </DialogContent>
      <DialogActions className={sharedStyles.dialogActions}>
        <Button onClick={onClose} className={sharedStyles.dialogBtnSubmit}>
          Готово
        </Button>
      </DialogActions>
    </Dialog>
  )
}
