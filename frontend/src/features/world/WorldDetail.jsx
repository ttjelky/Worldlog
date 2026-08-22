import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
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
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import backBtnStyles from '../../shared/styles/backButton.module.css'
import PlayersSection from './components/PlayersSection/PlayersSection'
import LocationsSection from './components/LocationsSection/LocationsSection'
import TodosSection from './components/TodosSection/TodosSection'
import HistorySection from './components/HistorySection/HistorySection'
import sharedStyles from './components/shared/section.module.css'
import ExpandableCard from './components/shared/ExpandableCard'
import styles from './WorldDetail.module.css'

const RED = '#A63C39'
const GREEN = '#247A57'
const MIN_SLOT_WIDTH = 340

const CARD_META = {
  info:      { row: 0, slotClass: 'slotTypeInfo' },
  cover:     { row: 0, slotClass: 'slotTypeCover' },
  players:   { row: 1, slotClass: 'slotTypePlayers' },
  locations: { row: 1, slotClass: 'slotTypeLocations' },
  todos:     { row: 2, slotClass: 'slotTypeTodos' },
  history:   { row: 2, slotClass: 'slotTypeHistory' },
}

const DEFAULT_CARDS = [
  { id: 'info', row: 0 },
  { id: 'cover', row: 0 },
  { id: 'players', row: 1 },
  { id: 'locations', row: 1 },
  { id: 'todos', row: 2 },
  { id: 'history', row: 2 },
]

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

function InfoCard({ world }) {
  const stats = [
    ['Гравці', world.players_count],
    ['Локації', world.locations_count],
    ['Todo', `${world.todos_done}/${world.todos_count}`],
    ['Події', world.history_count],
  ]

  return (
    <div className={`${sharedStyles.card} ${styles.infoCard}`} style={{ '--accent': RED }}>
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
    </div>
  )
}

function CoverImageCard({ world, worldId }) {
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
      api.patch(`/worlds/${worldId}/`, { cover_image: '' }, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => qc.invalidateQueries(['world', String(worldId)]),
  })

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadCover.mutate(file)
  }

  return (
    <div className={`${sharedStyles.card} ${styles.coverCard}`} style={{ '--accent': '#6b7280' }}>
      {world.cover_image_url ? (
        <>
          <input ref={inputRef} type="file" accept="image/*" className={styles.coverFileInput} onChange={handleFile} />
          <img className={styles.coverImgFull} src={world.cover_image_url} alt={world.name} />
          <div className={styles.coverOverlay}>
            <IconButton className={styles.coverAction} onClick={() => inputRef.current?.click()} disabled={uploadCover.isPending}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton className={styles.coverAction} onClick={() => deleteCover.mutate()} disabled={deleteCover.isPending}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </div>
        </>
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/*" className={styles.coverFileInput} onChange={handleFile} />
          <button type="button" className={styles.coverPlaceholder} onClick={() => inputRef.current?.click()} disabled={uploadCover.isPending}>
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
    mutationFn: () => api.patch(`/worlds/${worldId}/`, form),
    onSuccess: () => {
      qc.invalidateQueries(['world', String(worldId)])
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/worlds/${worldId}/`),
    onSuccess: () => {
      qc.invalidateQueries(['worlds'])
      navigate('/app')
    },
  })

  const submit = (e) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
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
              if (window.confirm('Ви впевнені, що хочете видалити цей світ? Це незворотно.')) {
                deleteMutation.mutate()
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

const CARD_CONTENT = {
  info: (props) => <InfoCard world={props.world} />,
  cover: (props) => <CoverImageCard world={props.world} worldId={props.worldId} />,
  players: (props) => <ExpandableCard><PlayersSection worldId={props.worldId} accent={GREEN} /></ExpandableCard>,
  locations: (props) => <ExpandableCard><LocationsSection worldId={props.worldId} accent={RED} /></ExpandableCard>,
  todos: (props) => <ExpandableCard><TodosSection worldId={props.worldId} accent={GREEN} /></ExpandableCard>,
  history: (props) => <ExpandableCard><HistorySection worldId={props.worldId} accent={RED} /></ExpandableCard>,
}

export default function WorldDetail({ onBack }) {
  const { worldId } = useParams()
  const { data: world, isLoading } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => api.get(`/worlds/${worldId}/`).then((r) => r.data),
  })

  const [editMode, setEditMode] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [layout, setLayout] = useState(() => {
    const saved = loadLayout(worldId)
    return saved || { cards: DEFAULT_CARDS, flexes: {} }
  })
  const [drag, setDrag] = useState(null)
  const [resize, setResize] = useState(null)
  const flipSnapshotRef = useRef(null)

  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveLayout(worldId, layout), 300)
    return () => clearTimeout(saveTimerRef.current)
  }, [layout, worldId])

  const { cards, flexes } = layout
  const getRowCards = useCallback((row) => cards.filter((c) => c.row === row), [cards])

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

    // FLIP step 1 (First): snapshot every card's current position/size
    // before the swap so we can animate from here after the DOM updates.
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

      // Swap only the card ids between these two slots. Each slot keeps
      // its own fixed `row`, so every row always keeps exactly the same
      // number of cards — no more 3-in-a-row / cards landing in random rows.
      const nextCards = prev.cards.map((c) => ({ ...c }))
      nextCards[srcIdx].id = targetId
      nextCards[tgtIdx].id = sourceId

      // A card's manually-resized width follows it wherever it goes,
      // instead of leaking onto the card left behind (which caused the
      // "random size" bug).
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

  // FLIP steps 2-4 (Last, Invert, Play): once React has committed the new
  // positions, measure where each card ended up, offset it back to where it
  // used to be with a transform, then transition that transform away so the
  // card visibly glides into place instead of jumping.
  //
  // Reads and writes are batched into separate passes (read all, then write
  // all) instead of interleaved per card — interleaving forces the browser
  // to recompute layout on every single card, which is what made the
  // animation feel choppy.
  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null

    // Pass 1 — reads only: measure how far each card actually moved.
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

    // Pass 2 — writes only: pin every moved card back to its old spot.
    moves.forEach(({ el, dx, dy, sx, sy }) => {
      el.style.willChange = 'transform'
      el.style.transition = 'none'
      el.style.transformOrigin = 'top left'
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
    })

    // A single forced reflow flushes all the writes above at once, instead
    // of once per card.
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

  const renderCard = (cardId) => {
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
        className={`${styles.slot} ${styles[slotClass]} ${isDragging ? styles.dragging : ''} ${isOver ? styles.dragOver : ''} ${isLocked ? styles.locked : ''}`}
        draggable={editMode && !isLocked}
        onDragStart={isLocked ? undefined : (e) => onDragStart(e, cardId)}
        onDragOver={isLocked ? undefined : (e) => onDragOver(e, cardId)}
        onDrop={isLocked ? undefined : (e) => onDrop(e, cardId)}
        onDragEnd={onDragEnd}
        style={style}
      >
        {CARD_CONTENT[cardId]?.({ world, worldId })}
        {editMode && !isLocked && (
          <div className={styles.dragHandle}>
            <DragIndicatorIcon fontSize="small" />
          </div>
        )}
      </div>
    )
  }

  const renderRow = (rowCards) => {
    const result = []
    for (let i = 0; i < rowCards.length; i++) {
      result.push(renderCard(rowCards[i].id))
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
    <div className={`${styles.page} ${editMode ? styles.editMode : ''} ${resize ? styles.resizing : ''}`}>
      <div className={styles.topBar}>
        <Button className={backBtnStyles.backBtn} onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
          До всіх світів
        </Button>
        <div className={styles.topActions}>
          {editMode && (
            <Button className={styles.resetBtn} onClick={resetLayout}>
              Скинути
            </Button>
          )}
          <Button
            className={styles.worldEditBtn}
            onClick={() => setEditDialogOpen(true)}
            startIcon={<EditOutlinedIcon />}
          >
            Світ
          </Button>
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
        <div className={`${styles.row} ${styles.rowTop}`}>
          {renderRow(getRowCards(0))}
        </div>
        <div className={`${styles.row} ${styles.rowBottom}`}>
          {renderRow(getRowCards(1))}
        </div>
        <div className={styles.row}>
          {renderRow(getRowCards(2))}
        </div>
      </div>

      <WorldEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        world={world}
        worldId={worldId}
      />
    </div>
  )
}
