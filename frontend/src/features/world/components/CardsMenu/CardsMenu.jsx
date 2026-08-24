import { Button, Dialog, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
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
import styles from './CardsMenu.module.css'

const RED = '#A63C39'
const GREEN = '#247A57'

const CARD_DEFS = [
  {
    id: 'info',
    name: 'Інфо про світ',
    desc: 'Назва, опис, сід та основна статистика світу',
    icon: InfoIcon,
    accent: RED,
    locked: true,
    stub: (
      <>
        <div className={styles.stubTitle}>Назва світу</div>
        <div className={styles.stubDesc}>Короткий опис світу...</div>
        <div className={styles.stubChips}>
          <span className={styles.stubChip}>Сід: 12345</span>
          <span className={styles.stubChip}>Власник: user</span>
        </div>
        <div className={styles.stubStats}>
          <div className={styles.stubStat}><span className={styles.stubStatVal}>4</span><span className={styles.stubStatLbl}>Гравці</span></div>
          <div className={styles.stubStat}><span className={styles.stubStatVal}>12</span><span className={styles.stubStatLbl}>Локації</span></div>
          <div className={styles.stubStat}><span className={styles.stubStatVal}>3/8</span><span className={styles.stubStatLbl}>Todo</span></div>
          <div className={styles.stubStat}><span className={styles.stubStatVal}>5</span><span className={styles.stubStatLbl}>Події</span></div>
        </div>
      </>
    ),
  },
  {
    id: 'cover',
    name: 'Обкладинка',
    desc: 'Головне зображення світу',
    icon: PhotoIcon,
    accent: '#6b7280',
    locked: true,
    stub: (
      <div className={styles.stubCover}>
        <PhotoIcon sx={{ fontSize: 32, opacity: 0.4 }} />
        <span className={styles.stubCoverText}>Завантажити картинку</span>
      </div>
    ),
  },
  {
    id: 'players',
    name: 'Гравці',
    desc: 'Список гравців світу з аватарами та ролями',
    icon: PeopleIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubRow}>
          <div className={styles.stubAvatar}>A</div>
          <div><div className={styles.stubName}>Alex</div><div className={styles.stubRole}>Власник</div></div>
        </div>
        <div className={styles.stubRow}>
          <div className={styles.stubAvatar}>B</div>
          <div><div className={styles.stubName}>Builder</div><div className={styles.stubRole}>Будівельник</div></div>
        </div>
        <div className={styles.stubRow}>
          <div className={styles.stubAvatar}>M</div>
          <div><div className={styles.stubName}>Miner</div><div className={styles.stubRole}>Шахтар</div></div>
        </div>
      </>
    ),
  },
  {
    id: 'locations',
    name: 'Локації',
    desc: 'Зберігай локації світу з координатами, фото та описом',
    icon: PlaceIcon,
    accent: RED,
    stub: (
      <>
        <div className={styles.stubLocTile}>
          <div className={styles.stubLocImg} />
          <div className={styles.stubLocBody}>
            <div className={styles.stubName}>Замок</div>
            <div className={styles.stubCoords}>120 64 -340</div>
          </div>
        </div>
        <div className={styles.stubLocTile}>
          <div className={styles.stubLocImg} />
          <div className={styles.stubLocBody}>
            <div className={styles.stubName}>Шахта</div>
            <div className={styles.stubCoords}>-80 12 200</div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'todos',
    name: 'Todo-лист',
    desc: 'Завдання та плани з пріоритетами та статусом виконання',
    icon: AssignmentIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubTodoItem}>
          <div className={styles.stubTodoCheck} />
          <div className={styles.stubTodoText}>Побудувати базу</div>
          <span className={styles.stubPriority} style={{ background: '#FFB199' }}>Високий</span>
        </div>
        <div className={styles.stubTodoItem}>
          <div className={styles.stubTodoCheck} />
          <div className={styles.stubTodoText}>Знайти алмази</div>
          <span className={styles.stubPriority} style={{ background: '#B7EAC7' }}>Низький</span>
        </div>
        <div className={`${styles.stubTodoItem} ${styles.stubTodoDone}`}>
          <div className={`${styles.stubTodoCheck} ${styles.stubTodoCheckDone}`} />
          <div className={styles.stubTodoText}>Створити світ</div>
        </div>
      </>
    ),
  },
  {
    id: 'history',
    name: 'Історія',
    desc: 'Хроніка подій світу у вигляді таймлайну',
    icon: EventIcon,
    accent: RED,
    stub: (
      <>
        <div className={styles.stubTimelineItem}>
          <div className={styles.stubNode}>1</div>
          <div className={styles.stubEvent}>
            <div className={styles.stubEventDate}>01.01.2025</div>
            <div className={styles.stubName}>Початок пригоди</div>
          </div>
        </div>
        <div className={styles.stubTimelineItem}>
          <div className={styles.stubNode}>2</div>
          <div className={styles.stubEvent}>
            <div className={styles.stubEventDate}>15.03.2025</div>
            <div className={styles.stubName}>Знайдено алмази</div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'wiki',
    name: 'World Wiki',
    desc: 'Повноцінна вікі-система для персонажів, фракцій та лора',
    icon: MenuBookIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubWikiPage}>
          <span className={styles.stubWikiType}>Персонаж</span>
          <div className={styles.stubName}>Артур I</div>
          <div className={styles.stubDesc}>Засновник королівства...</div>
        </div>
        <div className={styles.stubWikiPage}>
          <span className={styles.stubWikiType}>Фракція</span>
          <div className={styles.stubName}>Північний альянс</div>
          <div className={styles.stubDesc}>Об'єднання північних...</div>
        </div>
      </>
    ),
  },
  {
    id: 'notes',
    name: 'Нотатки',
    desc: 'Прості нотатки та ідеї з тегами',
    icon: ArticleIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubNote}>
          <div className={styles.stubName}>Ідея для замку</div>
          <div className={styles.stubDesc}>Великий замок з вежами...</div>
          <div className={styles.stubTags}>
            <span className={styles.stubTag}>будівництво</span>
            <span className={styles.stubTag}>замок</span>
          </div>
        </div>
        <div className={styles.stubNote}>
          <div className={styles.stubName}>Список ресурсів</div>
          <div className={styles.stubDesc}>Потрібно: 64 стакан цегли...</div>
        </div>
      </>
    ),
  },
  {
    id: 'projects',
    name: 'Проєкти',
    desc: 'Великі цілі з автоматичним прогресом на основі задач',
    icon: TrendingUpIcon,
    accent: RED,
    stub: (
      <>
        <div className={styles.stubProject}>
          <div className={styles.stubName}>Побудова столиці</div>
          <div className={styles.stubProgressBar}>
            <div className={styles.stubProgressFill} style={{ width: '70%' }} />
          </div>
          <div className={styles.stubDesc}>70% — 7/10 задач</div>
        </div>
        <div className={styles.stubProject}>
          <div className={styles.stubName}>Мапа світу</div>
          <div className={styles.stubProgressBar}>
            <div className={styles.stubProgressFill} style={{ width: '30%' }} />
          </div>
          <div className={styles.stubDesc}>30% — 3/10 задач</div>
        </div>
      </>
    ),
  },
  {
    id: 'planner',
    name: 'Планер',
    desc: 'Планування майбутніх подій за датами',
    icon: CalendarMonthIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubPlannerItem}>
          <span className={styles.stubDateChip}>25.08</span>
          <div className={styles.stubName}>Битва з драконом</div>
        </div>
        <div className={styles.stubPlannerItem}>
          <span className={styles.stubDateChip}>01.09</span>
          <div className={styles.stubName}>Відкриття нового біому</div>
        </div>
        <div className={`${styles.stubPlannerItem} ${styles.stubPlannerOverdue}`}>
          <span className={`${styles.stubDateChip} ${styles.stubDateChipOverdue}`}>15.08</span>
          <div className={styles.stubName}>Завершити карту</div>
        </div>
      </>
    ),
  },
  {
    id: 'bookmarks',
    name: 'Закладки',
    desc: 'Збереження корисних посилань та референсів',
    icon: BookmarkIcon,
    accent: RED,
    stub: (
      <>
        <div className={styles.stubBookmark}>
          <div className={styles.stubBookmarkIcon}>🔗</div>
          <div>
            <div className={styles.stubName}>Minecraft Wiki</div>
            <div className={styles.stubUrl}>minecraft.wiki</div>
          </div>
        </div>
        <div className={styles.stubBookmark}>
          <div className={styles.stubBookmarkIcon}>📺</div>
          <div>
            <div className={styles.stubName}>Building Tutorial</div>
            <div className={styles.stubUrl}>youtube.com/watch...</div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'ideas',
    name: 'Ідеї',
    desc: 'Місце для ідей з можливістю перетворити на проєкт',
    icon: LightbulbIcon,
    accent: GREEN,
    stub: (
      <>
        <div className={styles.stubIdea}>
          <div className={styles.stubName}>Підземне озеро</div>
          <div className={styles.stubDesc}>Красиве підземне озеро зі світлячками...</div>
          <div className={styles.stubConvertBtn}>Перетворити на проєкт →</div>
        </div>
        <div className={styles.stubIdea}>
          <div className={styles.stubName}>Система каналів</div>
          <div className={styles.stubDesc}>Водні канали між містами...</div>
        </div>
      </>
    ),
  },
  {
    id: 'inspiration',
    name: 'Натхнення',
    desc: 'Moodboard-картка для зображень-референсів',
    icon: CollectionsIcon,
    accent: RED,
    stub: (
      <div className={styles.stubInspGrid}>
        <div className={styles.stubInspTile} />
        <div className={styles.stubInspTile} />
        <div className={styles.stubInspTile} />
        <div className={styles.stubInspTile} />
      </div>
    ),
  },
  {
    id: 'progress',
    name: 'Прогрес',
    desc: 'Статистика твого WorldLog: кількість локацій, Wiki-сторінок, задач тощо',
    icon: CheckCircleIcon,
    accent: GREEN,
    stub: (
      <div className={styles.stubStatsGrid}>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>4</span><span className={styles.stubStatLbl}>Гравці</span></div>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>12</span><span className={styles.stubStatLbl}>Локації</span></div>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>3/8</span><span className={styles.stubStatLbl}>Todo</span></div>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>5</span><span className={styles.stubStatLbl}>Події</span></div>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>8</span><span className={styles.stubStatLbl}>Wiki</span></div>
        <div className={styles.stubStatTile}><span className={styles.stubStatVal}>2</span><span className={styles.stubStatLbl}>Проєкти</span></div>
      </div>
    ),
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
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { className: styles.paper },
      }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Картки</h2>
        <IconButton className={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      <DialogContent className={styles.content}>
        <div className={styles.grid}>
          {CARD_DEFS.map((def) => {
            const Icon = def.icon
            const hidden = getHidden(def.id)
            return (
              <div
                key={def.id}
                className={styles.cell + (hidden ? ' ' + styles.cellHidden : '')}
              >
                <div
                  className={styles.preview}
                  style={{ '--accent': def.accent }}
                >
                  <div className={styles.previewHeader}>
                    <Icon sx={{ fontSize: 18, color: '#fff' }} />
                    <span className={styles.previewTitle}>{def.name}</span>
                  </div>
                  <div className={styles.previewBody}>
                    {def.stub}
                  </div>
                </div>
                <div className={styles.cellInfo}>
                  <div className={styles.cellDesc}>{def.desc}</div>
                  {def.locked ? (
                    <div className={styles.cellLockedBadge}>Завжди увімкнена</div>
                  ) : (
                    <button
                      className={`${styles.addBtn} ${!hidden ? styles.addBtnActive : ''}`}
                      onClick={() => onToggle(def.id)}
                    >
                      {!hidden ? (
                        <>
                          <CheckIcon sx={{ fontSize: 16 }} />
                          Додано
                        </>
                      ) : (
                        <>
                          <AddIcon sx={{ fontSize: 16 }} />
                          Додати
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
