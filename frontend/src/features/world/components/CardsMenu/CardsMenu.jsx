import { Dialog, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import styles from './CardsMenu.module.css'

const DEFAULT_RED = '#A63C39'
const DEFAULT_GREEN = '#247A57'

// Статичні SVG-мокапи замість живих секцій: відкриття меню більше
// не стріляє ~12 запитами на /worlds/0/... і не монтує useQuery.
function CardPreview({ id }) {
  return (
    <svg viewBox="0 0 200 110" width="100%" height="100%" aria-hidden="true" role="presentation">
      <rect x="8" y="10" width="120" height="12" rx="6" fill="currentColor" opacity="0.85" />
      <rect x="8" y="30" width="184" height="8" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="8" y="44" width="150" height="8" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="8" y="58" width="170" height="8" rx="4" fill="currentColor" opacity="0.18" />
      {id === 'relationships' ? (
        <>
          <circle cx="60" cy="88" r="10" fill="currentColor" opacity="0.5" />
          <circle cx="100" cy="88" r="10" fill="currentColor" opacity="0.35" />
          <circle cx="140" cy="88" r="10" fill="currentColor" opacity="0.5" />
          <line x1="70" y1="88" x2="90" y2="88" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="110" y1="88" x2="130" y2="88" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        </>
      ) : (
        <>
          <rect x="8" y="78" width="88" height="22" rx="11" fill="currentColor" opacity="0.35" />
          <rect x="104" y="78" width="88" height="22" rx="11" fill="currentColor" opacity="0.2" />
        </>
      )}
    </svg>
  )
}

function buildCardDefs(accents) {
  const green = accents?.green || DEFAULT_GREEN
  const red = accents?.red || DEFAULT_RED

  return [
    {
      id: 'players',
      name: 'Гравці',
      desc: 'Список гравців світу з аватарами та ролями',
      accent: green,
    },
    {
      id: 'locations',
      name: 'Локації',
      desc: 'Зберігай локації світу з координатами, фото та описом',
      accent: red,
    },
    {
      id: 'todos',
      name: 'Todo-лист',
      desc: 'Завдання та плани з пріоритетами та статусом виконання',
      accent: green,
    },
    {
      id: 'history',
      name: 'Історія',
      desc: 'Хроніка подій світу у вигляді таймлайну',
      accent: red,
    },
    {
      id: 'wiki',
      name: 'World Wiki',
      desc: 'Повноцінна вікі-система для персонажів, фракцій та лора',
      accent: green,
    },
    {
      id: 'notes',
      name: 'Нотатки',
      desc: 'Прості нотатки та ідеї з тегами',
      accent: green,
    },
    {
      id: 'projects',
      name: 'Проєкти',
      desc: 'Великі цілі з автоматичним прогресом на основі задач',
      accent: red,
    },
    {
      id: 'planner',
      name: 'Планер',
      desc: 'Планування майбутніх подій за датами',
      accent: green,
    },
    {
      id: 'bookmarks',
      name: 'Закладки',
      desc: 'Збереження корисних посилань та референсів',
      accent: red,
    },
    {
      id: 'ideas',
      name: 'Ідеї',
      desc: 'Місце для ідей з можливістю перетворити на проєкт',
      accent: green,
    },
    {
      id: 'progress',
      name: 'Прогрес',
      desc: 'Статистика твого WorldLog: кількість локацій, Wiki-сторінок, задач тощо',
      accent: green,
    },
    {
      id: 'relationships',
      name: "Зв'язки",
      desc: 'Граф звʼязків між сторінками вікі та елементами світу',
      accent: green,
    },
  ]
}

export default function CardsMenu({ open, onClose, layout, onToggle, accentRed, accentGreen, paperStyle }) {
  const { cards } = layout
  const CARD_DEFS = buildCardDefs({ red: accentRed, green: accentGreen })

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
        paper: { className: styles.paper, style: paperStyle },
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
                  <div className={styles.preview} style={{ '--accent': def.accent || accentRed }}>
                    <div className={styles.previewInner}>
                      <CardPreview id={def.id} />
                    </div>
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
