import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import TuneIcon from '@mui/icons-material/Tune'
import ViewListIcon from '@mui/icons-material/ViewList'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import backBtnStyles from '../../shared/styles/backButton.module.css'
import { useUndo } from '../../shared/undo/UndoProvider'
import ParticipantsSection from './components/ParticipantsSection/ParticipantsSection'
import PlayersSection from './components/PlayersSection/PlayersSection'
import LocationsSection from './components/LocationsSection/LocationsSection'
import TodosSection from './components/TodosSection/TodosSection'
import HistorySection from './components/HistorySection/HistorySection'
import NotesSection from './components/NotesSection/NotesSection'
import ProjectsSection from './components/ProjectsSection/ProjectsSection'
import PlannerSection from './components/PlannerSection/PlannerSection'
import BookmarksSection from './components/BookmarksSection/BookmarksSection'
import IdeasSection from './components/IdeasSection/IdeasSection'
import ProgressSection from './components/ProgressSection/ProgressSection'
import WikiSection from './components/WikiSection/WikiSection'
import RelationshipsSection from './components/RelationshipsSection/RelationshipsSection'
import CardsMenu from './components/CardsMenu/CardsMenu'
import sharedStyles from './components/shared/section.module.css'
import ExpandableCard, { useExpandableCard } from './components/shared/ExpandableCard'
import LocationViewerProvider from './components/shared/LocationViewer'
import ThemeSelector from '../../shared/components/ThemeSelector/ThemeSelector'
import { DEFAULT_THEME_ID, getWorldTheme, themeDialogStyle } from './themes'
import styles from './WorldDetail.module.css'

const MIN_SLOT_WIDTH = 340

const CARD_META = {
  info:          { row: 0, slotClass: 'slotTypeInfo' },
  cover:         { row: 0, slotClass: 'slotTypeCover' },
  players:       { row: 1, slotClass: 'slotTypePlayers' },
  participants:  { row: 1, slotClass: 'slotTypeParticipants' },
  locations:     { row: 1, slotClass: 'slotTypeLocations' },
  todos:         { row: 2, slotClass: 'slotTypeTodos' },
  history:       { row: 2, slotClass: 'slotTypeHistory' },
  notes:         { row: 3, slotClass: 'slotTypeNotes' },
  projects:      { row: 3, slotClass: 'slotTypeProjects' },
  planner:       { row: 4, slotClass: 'slotTypePlanner' },
  bookmarks:     { row: 4, slotClass: 'slotTypeBookmarks' },
  ideas:         { row: 5, slotClass: 'slotTypeIdeas' },
  wiki:          { row: 6, slotClass: 'slotTypeWiki' },
  progress:      { row: 6, slotClass: 'slotTypeProgress' },
  relationships: { row: 7, slotClass: 'slotTypeRelationships' },
}

const DEFAULT_CARDS = [
  { id: 'info', row: 0 },
  { id: 'cover', row: 0 },
  { id: 'players', row: 1 },
  { id: 'participants', row: 1 },
  { id: 'locations', row: 1 },
  { id: 'todos', row: 2 },
  { id: 'history', row: 2 },
  { id: 'notes', row: 3 },
  { id: 'projects', row: 3 },
  { id: 'planner', row: 4 },
  { id: 'bookmarks', row: 4 },
  { id: 'ideas', row: 5 },
  { id: 'wiki', row: 6 },
  { id: 'progress', row: 6 },
  { id: 'relationships', row: 7 },
]

function mergeWithDefaults(saved) {
  if (!saved?.cards) return null
  const merged = DEFAULT_CARDS.map((def) => {
    const savedCard = saved.cards.find((c) => c.id === def.id)
    return {
      ...def,
      ...savedCard,
      hidden: savedCard?.hidden ?? false,
    }
  })
  return { cards: merged, flexes: saved.flexes || {} }
}

function loadLayout(worldId) {
  try {
    const raw = localStorage.getItem(`world-layout-${worldId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveLayout(worldId, data) {
  try {
    localStorage.setItem(`world-layout-${worldId}`, JSON.stringify(data))
  } catch {}
}

function InfoCard({ world, accent }) {
  const stats = [
    ['Гравці', world.players_count],
    ['Локації', world.locations_count],
    ['Todo', `${world.todos_done}/${world.todos_count}`],
    ['Події', world.history_count],
  ]

  const { open, modal } = useExpandableCard()
  const cardRef = useRef(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    if (modal) return
    const el = cardRef.current
    if (!el) return
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [modal, world])

  return (
    <div
      ref={cardRef}
      className={`${sharedStyles.card} ${styles.infoCard} ${modal ? styles.infoCardExpanded : ''}`}
      style={{ '--accent': accent }}
    >
      <h2 className={styles.infoTitle}>{world.name}</h2>
      <p className={styles.infoDesc}>{world.description || 'Немає опису'}</p>
      <div className={styles.metaRow}>
        {world.seed && <span className={styles.metaChip}>Сід: {world.seed}</span>}
        {world.start_date && <span className={styles.metaChip}>Початок: {world.start_date}</span>}
        <span className={styles.metaChip}>Власник: {world.owner_username}</span>
      </div>
      <div className={styles.statsMini}>
        {stats.map(([label, value]) => (
          <div key={label} className={styles.statTile}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>
      {!modal && overflowing && (
        <div className={styles.showMoreFade}>
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
          >
            Показати більше
          </button>
        </div>
      )}
    </div>
  )
}

function CoverImageCard({ world, worldId, accent, userRole }) {
  const qc = useQueryClient()
  const inputRef = useRef(null)

  const uploadCover = useMutation({
    mutationFn: (file) => {
      const data = new FormData()
      data.append('cover_image', file)
      return api.patch(`/worlds/${worldId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries(['world', String(worldId)]),
  })

  const deleteCover = useMutation({
    mutationFn: () =>
      api.patch(
        `/worlds/${worldId}/`,
        { cover_image: '' },
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      ),
    onSuccess: () => qc.invalidateQueries(['world', String(worldId)]),
  })

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadCover.mutate(file)
  }

  const canEdit = userRole && userRole !== 'viewer'

  return (
    <div className={`${sharedStyles.card} ${styles.coverCard}`} style={{ '--accent': accent }}>
      {world.cover_image_url ? (
        <>
          {canEdit && <input ref={inputRef} type="file" accept="image/*" className={styles.coverFileInput} onChange={handleFile} />}
          <img className={styles.coverImgFull} src={world.cover_image_url} alt={world.name} />
          {canEdit && (
            <div className={styles.coverOverlay}>
              <IconButton className={styles.coverAction} onClick={() => inputRef.current?.click()} disabled={uploadCover.isPending}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton className={styles.coverAction} onClick={() => deleteCover.mutate()} disabled={deleteCover.isPending}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          )}
        </>
      ) : canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.coverFileInput}
            onChange={handleFile}
          />
          <button
            type="button"
            className={styles.coverPlaceholder}
            onClick={() => inputRef.current?.click()}
            disabled={uploadCover.isPending}
          >
            {uploadCover.isPending ? (
              <LinearProgress className={styles.coverProgress} />
            ) : (
              <>
                <PhotoCameraOutlinedIcon className={styles.coverPlaceholderIcon} />
                <span className={styles.coverPlaceholderText}>Завантажити картинку світу</span>
              </>
            )}
          </button>
        </>
      ) : (
        <div className={styles.coverPlaceholder} style={{ cursor: 'default' }}>
          <PhotoCameraOutlinedIcon className={styles.coverPlaceholderIcon} />
          <span className={styles.coverPlaceholderText}>Немає картинки</span>
        </div>
      )}
    </div>
  )
}

const LOCKED_CARDS = ['info', 'cover']

function WorldEditDialog({ open, onClose, world, worldId }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    seed: '',
    start_date: '',
    is_public: false,
  })

  useEffect(() => {
    if (world) {
      setForm({
        name: world.name || '',
        description: world.description || '',
        seed: world.seed || '',
        start_date: world.start_date || '',
        is_public: world.is_public || false,
      })
    }
  }, [world])

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/worlds/${worldId}/`, {
        ...form,
        // Порожній рядок дати DRF відхиляє 400-м; порожнє поле — це null
        start_date: form.start_date || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['world', String(worldId)])
      onClose()
    },
  })

  const { deleteWorld } = useUndo()

  const submit = (e) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const paperStyle = themeDialogStyle(world?.theme)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper, style: paperStyle } }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Редагувати світ</DialogTitle>
        <DialogContent>
          <div className={sharedStyles.formFields}>
            <TextField
              label="Назва світу"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <TextField
              label="Опис"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              minRows={2}
              maxRows={3}
            />
            <TextField
              label="Сід (seed)"
              value={form.seed}
              onChange={(e) => setForm((f) => ({ ...f, seed: e.target.value }))}
            />
            <TextField
              label="Дата початку"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button
            onClick={() => {
              if (window.confirm('Ви впевнені, що хочете видалити цей світ?')) {
                onClose()
                deleteWorld({ id: worldId, name: world?.name })
                navigate('/app')
              }
            }}
            startIcon={<DeleteOutlinedIcon />}
            className={sharedStyles.dialogBtnCancel}
          >
            Видалити світ
          </Button>
          <div style={{ flex: 1 }} />
          <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function ThemeDialog({ open, onClose, world, worldId }) {
  const qc = useQueryClient()
  const [theme, setTheme] = useState(DEFAULT_THEME_ID)

  useEffect(() => {
    if (world) setTheme(world.theme || DEFAULT_THEME_ID)
  }, [world])

  const updateTheme = useMutation({
    mutationFn: () => api.patch(`/worlds/${worldId}/`, { theme }),
    onSuccess: () => {
      qc.invalidateQueries(['world', String(worldId)])
      onClose()
    },
  })

  const submit = (e) => {
    e.preventDefault()
    updateTheme.mutate()
  }

  const paperStyle = themeDialogStyle(world?.theme)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper, style: paperStyle } }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Тема світу</DialogTitle>
        <DialogContent>
          <ThemeSelector value={theme} onChange={setTheme} />
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function buildCardContent({ world, worldId, red, green, cover, userRole }) {
  return {
    info: () => (
      <ExpandableCard>
        <InfoCard world={world} accent={red} />
      </ExpandableCard>
    ),
    cover: () => <CoverImageCard world={world} worldId={worldId} accent={cover} userRole={userRole} />,
    players: () => (
      <ExpandableCard>
        <PlayersSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    participants: () => (
      <ExpandableCard>
        <ParticipantsSection
          worldId={worldId}
          accent={green}
          userRole={userRole}
          world={world}
        />
      </ExpandableCard>
    ),
    locations: () => (
      <ExpandableCard wide>
        <LocationsSection worldId={worldId} accent={red} userRole={userRole} />
      </ExpandableCard>
    ),
    todos: () => (
      <ExpandableCard>
        <TodosSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    history: () => (
      <ExpandableCard>
        <HistorySection worldId={worldId} accent={red} userRole={userRole} world={world} />
      </ExpandableCard>
    ),
    notes: () => (
      <ExpandableCard>
        <NotesSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    projects: () => (
      <ExpandableCard>
        <ProjectsSection worldId={worldId} accent={red} userRole={userRole} />
      </ExpandableCard>
    ),
    planner: () => (
      <ExpandableCard>
        <PlannerSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    bookmarks: () => (
      <ExpandableCard>
        <BookmarksSection worldId={worldId} accent={red} userRole={userRole} />
      </ExpandableCard>
    ),
    ideas: () => (
      <ExpandableCard>
        <IdeasSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    wiki: () => (
      <ExpandableCard extraWide>
        <WikiSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    progress: () => (
      <ExpandableCard>
        <ProgressSection worldId={worldId} accent={green} userRole={userRole} />
      </ExpandableCard>
    ),
    relationships: () => (
      <ExpandableCard extraWide>
        <RelationshipsSection worldId={worldId} accent={green} />
      </ExpandableCard>
    ),
  }
}

export default function WorldDetail({ onBack }) {
  const { worldId } = useParams()
  const { data: world, isLoading } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  const [editMode, setEditMode] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [cardsMenuOpen, setCardsMenuOpen] = useState(false)
  const [rowConfigs, setRowConfigs] = useState(() => {
    const configs = {}
    DEFAULT_CARDS.forEach((card) => {
      if (!configs[card.row]) {
        configs[card.row] = DEFAULT_CARDS.filter((c) => c.row === card.row).length
      }
    })
    return configs
  })
  const [layout, setLayout] = useState(() => {
    const saved = loadLayout(worldId)
    return (
      mergeWithDefaults(saved) || {
        cards: DEFAULT_CARDS.map((c) => ({ ...c, hidden: false })),
        flexes: {},
      }
    )
  })
  const [drag, setDrag] = useState(null)
  const [resize, setResize] = useState(null)
  const flipSnapshotRef = useRef(null)

  const rearrangeRow = useCallback(
    (rowIndex, newCount) => {
      setLayout((prev) => {
        const allVisibleCards = prev.cards.filter((c) => !c.hidden)
        const hiddenCards = prev.cards.filter((c) => c.hidden)

        const newConfigs = { ...rowConfigs, [rowIndex]: newCount }

        const row0Cards = allVisibleCards.filter((c) => c.row === 0)
        const restCards = allVisibleCards.filter((c) => c.row > 0)

        const result = row0Cards.map((c) => ({ ...c }))

        let cardIndex = 0
        for (let row = 1; cardIndex < restCards.length; row++) {
          const count = newConfigs[row] || 2
          for (let i = 0; i < count && cardIndex < restCards.length; i++) {
            result.push({ ...restCards[cardIndex], row })
            cardIndex++
          }
        }

        return { ...prev, cards: [...result, ...hiddenCards] }
      })
    },
    [rowConfigs],
  )

  const handleRowConfigChange = useCallback(
    (rowIndex, newCount) => {
      setRowConfigs((prev) => ({ ...prev, [rowIndex]: newCount }))
      rearrangeRow(rowIndex, newCount)
    },
    [rearrangeRow],
  )

  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveLayout(worldId, layout), 300)
    return () => clearTimeout(saveTimerRef.current)
  }, [layout, worldId])

  const { cards, flexes } = layout
  const getRowCards = useCallback((row) => cards.filter((c) => c.row === row && !c.hidden), [cards])

  const onToggleCard = (cardId) => {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, hidden: !c.hidden } : c)),
    }))
  }

  const onDragStart = (e, cardId) => {
    if (!editMode) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', cardId)
    requestAnimationFrame(() => setDrag({ id: cardId }))
  }

  const onDragOver = (e, targetId) => {
    if (!drag || !editMode) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDrag((d) => d && { ...d, over: targetId })
  }

  const onDrop = (e, targetId) => {
    e.preventDefault()
    if (!drag || !editMode) return
    const sourceId = drag.id
    setDrag(null)
    if (sourceId === targetId) return

    const snapshot = {}
    Object.keys(CARD_META).forEach((id) => {
      const el = document.getElementById(`slot-${id}`)
      if (el) snapshot[id] = el.getBoundingClientRect()
    })
    flipSnapshotRef.current = snapshot

    setLayout((prev) => {
      const srcIdx = prev.cards.findIndex((c) => c.id === sourceId)
      const tgtIdx = prev.cards.findIndex((c) => c.id === targetId)
      if (srcIdx === -1 || tgtIdx === -1) return prev

      const nextCards = prev.cards.map((c) => ({ ...c }))
      nextCards[srcIdx].id = targetId
      nextCards[tgtIdx].id = sourceId

      const nextFlexes = { ...prev.flexes }
      const srcFlex = prev.flexes[sourceId]
      const tgtFlex = prev.flexes[targetId]
      if (srcFlex !== undefined) nextFlexes[targetId] = srcFlex
      else delete nextFlexes[targetId]
      if (tgtFlex !== undefined) nextFlexes[sourceId] = tgtFlex
      else delete nextFlexes[sourceId]

      return { ...prev, cards: nextCards, flexes: nextFlexes }
    })
  }

  const onDragEnd = () => setDrag(null)

  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null

    const moves = []
    Object.keys(snapshot).forEach((id) => {
      const el = document.getElementById(`slot-${id}`)
      if (!el) return
      const before = snapshot[id]
      const after = el.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      const sx = after.width ? before.width / after.width : 1
      const sy = after.height ? before.height / after.height : 1

      const unchanged =
        Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01
      if (!unchanged) moves.push({ el, dx, dy, sx, sy })
    })

    if (moves.length === 0) return

    moves.forEach(({ el, dx, dy, sx, sy }) => {
      el.style.willChange = 'transform'
      el.style.transition = 'none'
      el.style.transformOrigin = 'top left'
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
    })

    // eslint-disable-next-line no-unused-expressions
    document.body.offsetHeight

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moves.forEach(({ el }) => {
          el.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          el.style.transform = ''
          const cleanup = () => {
            el.style.transition = ''
            el.style.transformOrigin = ''
            el.style.willChange = ''
            el.removeEventListener('transitionend', cleanup)
          }
          el.addEventListener('transitionend', cleanup)
        })
      })
    })
  }, [layout.cards])

  const onResizeStart = (e, leftId, rightId) => {
    e.preventDefault()
    e.stopPropagation()
    const leftEl = document.getElementById(`slot-${leftId}`)
    const rightEl = document.getElementById(`slot-${rightId}`)
    if (!leftEl || !rightEl) return
    setResize({
      leftId,
      rightId,
      startX: e.clientX,
      startLeftW: leftEl.offsetWidth,
      startRightW: rightEl.offsetWidth,
    })
  }

  useEffect(() => {
    if (!resize) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e) => {
      const dx = e.clientX - resize.startX
      const totalW = resize.startLeftW + resize.startRightW
      const maxLeft = totalW - MIN_SLOT_WIDTH
      const newLeftW = Math.min(maxLeft, Math.max(MIN_SLOT_WIDTH, resize.startLeftW + dx))
      const newRightW = totalW - newLeftW
      setLayout((prev) => ({
        ...prev,
        flexes: {
          ...prev.flexes,
          [resize.leftId]: newLeftW,
          [resize.rightId]: newRightW,
        },
      }))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResize(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resize])

  const resetLayout = () => {
    setLayout({ cards: DEFAULT_CARDS, flexes: {} })
    localStorage.removeItem(`world-layout-${worldId}`)
  }

  if (isLoading) return <LinearProgress />
  if (!world) return <p>Світ не знайдено</p>

  const theme = getWorldTheme(world.theme)
  const red = theme.accentRed
  const green = theme.accentGreen
  const cover = theme.cover
  const userRole = world.current_user_role
  const CARD_CONTENT = buildCardContent({ world, worldId, red, green, cover, userRole })

  const renderCard = (cardId, isSingle) => {
    const flex = flexes[cardId]
    const style = {}
    if (flex) {
      style.flex = `1 1 ${flex}px`
    }
    const isDragging = drag?.id === cardId
    const isOver = drag?.over === cardId
    const slotClass = CARD_META[cardId]?.slotClass || ''
    const isLocked = editMode && LOCKED_CARDS.includes(cardId)

    return (
      <div
        key={cardId}
        id={`slot-${cardId}`}
        className={`${styles.slot} ${styles[slotClass]} ${isSingle ? styles.slotSingle : ''} ${isDragging ? styles.dragging : ''} ${isOver ? styles.dragOver : ''} ${isLocked ? styles.locked : ''}`}
        draggable={editMode && !isLocked}
        onDragStart={isLocked ? undefined : (e) => onDragStart(e, cardId)}
        onDragOver={isLocked ? undefined : (e) => onDragOver(e, cardId)}
        onDrop={isLocked ? undefined : (e) => onDrop(e, cardId)}
        onDragEnd={onDragEnd}
        style={style}
      >
        {CARD_CONTENT[cardId]?.()}
        {editMode && !isLocked && (
          <div className={styles.dragHandle}>
            <DragIndicatorIcon fontSize="small" />
          </div>
        )}
      </div>
    )
  }

  const renderRow = (rowCards) => {
    const isSingle = rowCards.length === 1
    const result = []
    for (let i = 0; i < rowCards.length; i++) {
      result.push(renderCard(rowCards[i].id, isSingle))
      if (i < rowCards.length - 1) {
        const leftId = rowCards[i].id
        const rightId = rowCards[i + 1].id
        const leftLocked = editMode && LOCKED_CARDS.includes(leftId)
        const rightLocked = editMode && LOCKED_CARDS.includes(rightId)
        const locked = leftLocked || rightLocked
        result.push(
          <div
            key={`resize-${leftId}-${rightId}`}
            className={`${styles.resizeBar} ${editMode && !locked ? styles.resizeBarVisible : ''}`}
            onMouseDown={editMode && !locked ? (e) => onResizeStart(e, leftId, rightId) : undefined}
          >
            <div className={styles.resizeBarLine} />
          </div>,
        )
      }
    }
    return result
  }

  return (
    <LocationViewerProvider accent={red}>
      <div
        className={`${styles.page} ${editMode ? styles.editMode : ''} ${resize ? styles.resizing : ''}`}
        style={{
          '--page-bg': theme.pageBg,
          '--page-ink': theme.ink,
          '--page-soft': theme.soft,
          '--page-soft-hover': theme.softHover,
          '--page-active-bg': theme.activeBg,
          '--page-active-bg-hover': theme.activeBgHover,
          '--page-active-ink': theme.activeInk,
          '--page-row-bg': theme.rowBg,
          '--page-row-label': theme.rowLabel,
          '--page-outline': theme.outline,
          '--page-outline-hover': theme.outlineHover,
          '--page-dragover': theme.dragOver,
          '--page-resize': theme.resize,
          '--page-resize-active': theme.resizeActive,
        }}
      >
        <div className={styles.topBar}>
          <Button className={backBtnStyles.backBtn} onClick={onBack}>
            <ArrowBackIcon fontSize="small" />
            Назад
          </Button>
          <div className={styles.topActions}>
            {editMode && (
              <Button className={styles.resetBtn} onClick={resetLayout}>
                Скинути
              </Button>
            )}
            <Button
              className={styles.worldEditBtn}
              onClick={() => setCardsMenuOpen(true)}
              startIcon={<ViewListIcon />}
            >
              Картки
            </Button>
            {userRole && userRole !== 'viewer' && (
              <Button
                className={styles.worldEditBtn}
                onClick={() => setEditDialogOpen(true)}
                startIcon={<EditOutlinedIcon />}
              >
                Світ
              </Button>
            )}
            {userRole && userRole !== 'viewer' && (
              <Button
                className={styles.worldEditBtn}
                onClick={() => setThemeDialogOpen(true)}
                startIcon={<PaletteOutlinedIcon />}
              >
                Тема
              </Button>
            )}
            <Button
              className={`${styles.editBtn} ${editMode ? styles.editBtnActive : ''}`}
              onClick={() => setEditMode((v) => !v)}
              startIcon={<TuneIcon />}
            >
              {editMode ? 'Готово' : 'Оверлей'}
            </Button>
          </div>
        </div>

        <div className={styles.board}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((rowIndex) => (
            <div key={rowIndex} className={styles.rowWrapper}>
              {editMode && rowIndex > 0 && (
                <div className={styles.rowControls}>
                  <span className={styles.rowLabel}>Ряд {rowIndex + 1}</span>
                  <ButtonGroup className={styles.cardsPerRowGroup}>
                    {[1, 2, 3].map((value) => (
                      <Button
                        key={value}
                        className={`${styles.cardsPerRowBtn} ${(rowConfigs[rowIndex] || 2) === value ? styles.cardsPerRowBtnActive : ''}`}
                        onClick={() => handleRowConfigChange(rowIndex, value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
              )}
              <div
                className={`${styles.row} ${rowIndex === 0 ? styles.rowTop : ''} ${rowIndex === 1 ? styles.rowBottom : ''}`}
              >
                {renderRow(getRowCards(rowIndex))}
              </div>
            </div>
          ))}
        </div>

        <WorldEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          world={world}
          worldId={worldId}
        />
        <ThemeDialog
          open={themeDialogOpen}
          onClose={() => setThemeDialogOpen(false)}
          world={world}
          worldId={worldId}
        />
        <CardsMenu
          open={cardsMenuOpen}
          onClose={() => setCardsMenuOpen(false)}
          layout={layout}
          onToggle={onToggleCard}
          accentRed={red}
          accentGreen={green}
        />
      </div>
    </LocationViewerProvider>
  )
}
