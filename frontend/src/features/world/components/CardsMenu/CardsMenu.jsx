import { Dialog, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import PlayersSection from '../PlayersSection/PlayersSection'
import LocationsSection from '../LocationsSection/LocationsSection'
import TodosSection from '../TodosSection/TodosSection'
import HistorySection from '../HistorySection/HistorySection'
import NotesSection from '../NotesSection/NotesSection'
import ProjectsSection from '../ProjectsSection/ProjectsSection'
import PlannerSection from '../PlannerSection/PlannerSection'
import BookmarksSection from '../BookmarksSection/BookmarksSection'
import IdeasSection from '../IdeasSection/IdeasSection'
import ProgressSection from '../ProgressSection/ProgressSection'
import WikiSection from '../WikiSection/WikiSection'
import styles from './CardsMenu.module.css'

const RED = '#A63C39'
const GREEN = '#247A57'
const PREVIEW_WORLD_ID = '0'

const CARD_DEFS = [
  {
    id: 'players',
    name: 'Гравці',
    desc: 'Список гравців світу з аватарами та ролями',
    accent: GREEN,
    render: (accent) => <PlayersSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'locations',
    name: 'Локації',
    desc: 'Зберігай локації світу з координатами, фото та описом',
    accent: RED,
    render: (accent) => <LocationsSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'todos',
    name: 'Todo-лист',
    desc: 'Завдання та плани з пріоритетами та статусом виконання',
    accent: GREEN,
    render: (accent) => <TodosSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'history',
    name: 'Історія',
    desc: 'Хроніка подій світу у вигляді таймлайну',
    accent: RED,
    render: (accent) => <HistorySection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'wiki',
    name: 'World Wiki',
    desc: 'Повноцінна вікі-система для персонажів, фракцій та лора',
    accent: GREEN,
    render: (accent) => <WikiSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'notes',
    name: 'Нотатки',
    desc: 'Прості нотатки та ідеї з тегами',
    accent: GREEN,
    render: (accent) => <NotesSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'projects',
    name: 'Проєкти',
    desc: 'Великі цілі з автоматичним прогресом на основі задач',
    accent: RED,
    render: (accent) => <ProjectsSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'planner',
    name: 'Планер',
    desc: 'Планування майбутніх подій за датами',
    accent: GREEN,
    render: (accent) => <PlannerSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'bookmarks',
    name: 'Закладки',
    desc: 'Збереження корисних посилань та референсів',
    accent: RED,
    render: (accent) => <BookmarksSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'ideas',
    name: 'Ідеї',
    desc: 'Місце для ідей з можливістю перетворити на проєкт',
    accent: GREEN,
    render: (accent) => <IdeasSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
  },
  {
    id: 'progress',
    name: 'Прогрес',
    desc: 'Статистика твого WorldLog: кількість локацій, Wiki-сторінок, задач тощо',
    accent: GREEN,
    render: (accent) => <ProgressSection worldId={PREVIEW_WORLD_ID} accent={accent} />,
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
          {[...CARD_DEFS]
            .sort((a, b) => {
              const aHidden = getHidden(a.id)
              const bHidden = getHidden(b.id)
              return aHidden === bHidden ? 0 : aHidden ? -1 : 1
            })
            .map((def) => {
              const hidden = getHidden(def.id)
              return (
                <div key={def.id} className={styles.cell + (!hidden ? ' ' + styles.cellAdded : '')}>
                  <div className={styles.preview} style={{ '--accent': def.accent || RED }}>
                    {def.render ? (
                      <div className={styles.previewInner}>{def.render(def.accent)}</div>
                    ) : (
                      def.preview
                    )}
                  </div>
                  <div className={styles.cellInfo}>
                    <div className={styles.cellDesc}>{def.desc}</div>
                    {def.locked ? (
                      <div className={styles.cellLockedBadge}>Завжди увімкнена</div>
                    ) : (
                      <button
                        className={styles.addBtn + (!hidden ? ' ' + styles.addBtnActive : '')}
                        onClick={() => onToggle(def.id)}
                      >
                        {!hidden ? (
                          'Прибрати картку'
                        ) : (
                          <>
                            <AddIcon sx={{ fontSize: 16 }} />
                            Додати картку
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
