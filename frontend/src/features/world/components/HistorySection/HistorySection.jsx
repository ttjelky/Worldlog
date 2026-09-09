import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import CloseIcon from '@mui/icons-material/Close'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import FlagIcon from '@mui/icons-material/Flag'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsMmaIcon from '@mui/icons-material/SportsMma'
import ConstructionIcon from '@mui/icons-material/Construction'
import DangerousIcon from '@mui/icons-material/Dangerous'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import api from '../../../../api'
import { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import { useFeedback } from '../../../../shared/feedback/FeedbackProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './HistorySection.module.css'

const TITLE_MAX = 200

const eventTypes = [
  ['battle', 'Битва'],
  ['building', 'Будівництво'],
  ['death', 'Смерть'],
  ['boss', 'Бос'],
  ['discovery', 'Відкриття'],
  ['achievement', 'Досягнення'],
  ['other', 'Інше'],
]
const typeLabels = Object.fromEntries(eventTypes)

const typeIcons = {
  battle: SportsMmaIcon,
  building: ConstructionIcon,
  death: LocalFireDepartmentIcon,
  boss: DangerousIcon,
  discovery: TravelExploreIcon,
  achievement: EmojiEventsIcon,
  other: MoreHorizIcon,
}
const typeColors = {
  battle: '#e05252',
  building: '#4aa8d8',
  death: '#9a6bb8',
  boss: '#e8855a',
  discovery: '#4caf7d',
  achievement: '#e6b44d',
  other: '#9aa0a6',
}

// Локальна дата YYYY-MM-DD (на відміну від toISOString, без зсуву UTC)
function todayLocal() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Стабільний рендер дат: date-only рядки парсимо як полудень,
// щоб таймзона не зсувала день
function fmtDate(value) {
  if (!value) return ''
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString('uk-UA')
}

const empty = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  event_type: 'other',
  is_important: false,
  game_day: '',
  epoch: '',
  coord_x: '',
  coord_y: '',
  coord_z: '',
  participants: [],
}

export default function HistorySection({ worldId, accent, userRole, world }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [pendingImage, setPendingImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [epochFilter, setEpochFilter] = useState('current')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [importantOnly, setImportantOnly] = useState(false)
  const [epochDialog, setEpochDialog] = useState(false)
  const [closeEpoch, setCloseEpoch] = useState(null)
  const canEdit = userRole && userRole !== 'viewer'
  const { notify } = useFeedback()
  const photoInputRef = useRef(null)

  const { data: events = [] } = useQuery({
    queryKey: ['history', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/history/`).then((r) => r.data),
  })
  const { data: epochs = [] } = useQuery({
    queryKey: ['epochs', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/epochs/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const { data: players = [] } = useQuery({
    queryKey: ['players', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/players/`).then((r) => r.data),
  })
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/history/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/history/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['history', String(worldId)])
      qc.invalidateQueries(['epochs', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
    onError: () => notify('Не вдалося зберегти подію'),
  })
  const imageMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const data = new FormData()
      data.append('image', file)
      // Заголовок не ставимо — axios сам додасть multipart з boundary
      return api.patch(`/worlds/${worldId}/history/${id}/`, data)
    },
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
    onError: () => notify('Не вдалося завантажити фото'),
  })
  const deleteImageMutation = useMutation({
    mutationFn: (id) => api.patch(`/worlds/${worldId}/history/${id}/`, { image: null }),
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
    onError: () => notify('Не вдалося видалити фото'),
  })
  const epochMutation = useMutation({
    mutationFn: (payload) => api.post(`/worlds/${worldId}/epochs/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['epochs', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
    onError: () => notify('Не вдалося створити епоху'),
  })
  const epochCloseMutation = useMutation({
    mutationFn: ({ id, name }) => api.post(`/worlds/${worldId}/epochs/${id}/close/`, { name }),
    onSuccess: () => {
      qc.invalidateQueries(['epochs', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
    onError: () => notify('Не вдалося завершити епоху'),
  })
  const undo = useUndo()
  const deleteEvent = (h) =>
    undo.deleteItem({
      id: h.id,
      url: `/worlds/${worldId}/history/${h.id}/`,
      queryKeys: [
        ['history', String(worldId)],
        ['epochs', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Подію «${h.title}» видалено`,
      nouns: ['подія', 'події', 'подій'],
    })
  const deleteEpoch = (e) =>
    undo.deleteItem({
      id: e.id,
      url: `/worlds/${worldId}/epochs/${e.id}/`,
      queryKeys: [
        ['epochs', String(worldId)],
        ['history', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Епоху «${e.name}» видалено`,
    })

  useEffect(() => {
    // Cleanup попереднього URL — повертаємо функцію, інакше відкличемо новий
    return () => {
      if (pendingImage?.url) URL.revokeObjectURL(pendingImage.url)
    }
  }, [pendingImage])

  const activeEpochObj = useMemo(
    () => epochs.find((e) => e.is_active) || null,
    [epochs],
  )

  const availablePlayers = useMemo(
    () =>
      players
        .map((p) => p.nickname)
        .filter((n) => n && !form.participants.includes(n))
        .sort((a, b) => a.localeCompare(b, 'uk')),
    [players, form.participants],
  )

  const openNew = (presetEpochId) => {
    setEditing(null)
    setForm({ ...empty, date: todayLocal(), epoch: presetEpochId ?? activeEpochObj?.id ?? '' })
    setPendingImage(null)
    setRemoveImage(false)
    setOpen(true)
  }
  const openEdit = (h) => {
    setEditing(h)
    setForm({
      title: h.title,
      description: h.description,
      date: h.date,
      event_type: h.event_type,
      is_important: !!h.is_important,
      game_day: h.game_day ?? '',
      epoch: h.epoch ?? '',
      coord_x: h.coordinates?.x ?? '',
      coord_y: h.coordinates?.y ?? '',
      coord_z: h.coordinates?.z ?? '',
      participants: h.participants_list || [],
    })
    setPendingImage(null)
    setRemoveImage(false)
    setOpen(true)
  }

  const addParticipant = (name) => {
    const v = (name || '').trim()
    if (!v || form.participants.includes(v)) return
    setForm((f) => ({ ...f, participants: [...f.participants, v] }))
  }
  const removeParticipant = (name) =>
    setForm((f) => ({ ...f, participants: f.participants.filter((p) => p !== name) }))

  const submit = (e) => {
    e.preventDefault()
    const title = form.title.trim()
    if (title.length > TITLE_MAX) {
      notify(`Заголовок задовгий (макс. ${TITLE_MAX} символів)`)
      return
    }
    const rawCoords = [form.coord_x, form.coord_y, form.coord_z]
    const filledCoords = rawCoords.filter((v) => v !== '')
    if (filledCoords.length > 0 && filledCoords.length < 3) {
      notify('Заповни всі три координати (X, Y, Z) або жодної')
      return
    }
    const payload = {
      title,
      description: form.description,
      date: form.date,
      event_type: form.event_type,
      is_important: form.is_important,
      // При редагуванні порожня епоха = «без епохи», не перепризначаємо мовчки
      epoch: form.epoch || (editing ? null : (activeEpochObj?.id ?? null)),
      participants: form.participants.join(', '),
    }
    if (form.game_day !== '') payload.game_day = Number(form.game_day)
    if (filledCoords.length === 3) {
      const nums = filledCoords.map(Number)
      if (nums.some((n) => !Number.isInteger(n))) {
        notify('Координати — цілі числа')
        return
      }
      ;[payload.coord_x, payload.coord_y, payload.coord_z] = nums
    } else if (editing && editing.coordinates) {
      // Усі поля порожні, а були координати — явно очищуємо
      payload.coord_x = null
      payload.coord_y = null
      payload.coord_z = null
    }
    if (!pendingImage?.file && removeImage && editing) payload.image = null
    mutation
      .mutateAsync(payload)
      .then(({ data }) => {
        if (pendingImage?.file && data?.id) {
          imageMutation.mutate({ id: data.id, file: pendingImage.file })
        }
        setOpen(false)
      })
      .catch(() => {
        // Тост уже показано в onError мутації
      })
  }

  // «Поточна епоха» без активної епохи = усі (інакше список порожній)
  const visibleEpochId =
    epochFilter === 'all' ? '' : activeEpochObj ? String(activeEpochObj.id) : ''

  const filtered = useMemo(() => {
    let list = [...events]
    if (visibleEpochId) list = list.filter((e) => String(e.epoch) === visibleEpochId)
    if (typeFilter) list = list.filter((e) => e.event_type === typeFilter)
    if (importantOnly) list = list.filter((e) => e.is_important)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((e) =>
        `${e.title || ''} ${e.description || ''} ${(e.participants_list || []).join(' ')} ${
          e.date || ''
        } ${e.game_day ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    }
    list.sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date)
      return sortDir === 'asc' ? diff : -diff
    })
    return list
  }, [events, visibleEpochId, typeFilter, importantOnly, search, sortDir])

  const grouped = useMemo(() => {
    const byEpoch = new Map()
    for (const e of filtered) {
      const key = String(e.epoch || 'none')
      if (!byEpoch.has(key)) byEpoch.set(key, [])
      byEpoch.get(key).push(e)
    }
    const result = []
    const sortedEpochs = [...epochs].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    for (const ep of sortedEpochs) {
      if (visibleEpochId && String(ep.id) !== visibleEpochId) continue
      result.push({ epoch: ep, events: byEpoch.get(String(ep.id)) || [] })
    }
    // Без епохи — завжди останніми
    const none = byEpoch.get('none') || []
    if (none.length > 0) result.push({ epoch: null, events: none })
    return result
  }, [filtered, epochs, visibleEpochId])

  const stats = useMemo(() => {
    const bossCount = events.filter((e) => e.event_type === 'boss').length
    return {
      total: events.length,
      bosses: bossCount,
      epochs: epochs.length,
      important: events.filter((e) => e.is_important).length,
    }
  }, [events, epochs])

  // Сортування список не порожнить, тому в «активні фільтри» не входить
  const hasActiveFilters = typeFilter !== null || importantOnly || search.trim() !== ''

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `history-world-${worldId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyCoords = (coords) => {
    if (!coords) return
    navigator.clipboard
      ?.writeText(`${coords.x} ${coords.y} ${coords.z}`)
      .then(() => notify('Координати скопійовано'))
      .catch(() => notify('Не вдалося скопіювати'))
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Історія світу ({events.length})</h3>
        {canEdit && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openNew()}>
            Нова подія
          </Button>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <AutoAwesomeIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>подій</span>
        </div>
        <div className={styles.stat}>
          <DangerousIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.bosses}</span>
          <span className={styles.statLabel}>босів</span>
        </div>
        <div className={styles.stat}>
          <FlagIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.important}</span>
          <span className={styles.statLabel}>важливих</span>
        </div>
        <div className={styles.stat}>
          <MenuBookIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.epochs}</span>
          <span className={styles.statLabel}>епох</span>
        </div>
      </div>

      <div className={styles.filters} role="group" aria-label="Фільтр епох">
        <Button
          size="small"
          variant={epochFilter === 'all' ? 'contained' : 'outlined'}
          aria-pressed={epochFilter === 'all'}
          onClick={() => setEpochFilter('all')}
          className={`${styles.epochFilterButton} ${
            epochFilter === 'all' ? styles.epochFilterButtonActive : ''
          }`}
        >
          Усі епохи
        </Button>
        <Button
          size="small"
          variant={epochFilter === 'current' ? 'contained' : 'outlined'}
          aria-pressed={epochFilter === 'current'}
          onClick={() => setEpochFilter('current')}
          className={`${styles.epochFilterButton} ${
            epochFilter === 'current' ? styles.epochFilterButtonActive : ''
          }`}
        >
          Поточна епоха
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          title="Порядок дат"
          aria-label={sortDir === 'asc' ? 'Спочатку давні, натисніть для зміни' : 'Спочатку нові, натисніть для зміни'}
          className={styles.epochFilterButton}
        >
          {sortDir === 'asc' ? 'Давні ↑' : 'Нові ↓'}
        </Button>
        <Button
          size="small"
          variant={importantOnly ? 'contained' : 'outlined'}
          aria-pressed={importantOnly}
          onClick={() => setImportantOnly((v) => !v)}
          title="Тільки важливі події"
          startIcon={importantOnly ? <StarIcon /> : <StarBorderIcon />}
          className={`${styles.epochFilterButton} ${
            importantOnly ? styles.epochFilterButtonActive : ''
          }`}
        >
          Важливі
        </Button>
        {events.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={exportJson}
            title="Завантажити видимі події як JSON"
            className={styles.epochFilterButton}
          >
            Експорт
          </Button>
        )}
      </div>

      {filtered.length !== events.length && (
        <p className={styles.countNote}>
          Показано {filtered.length} з {events.length}
        </p>
      )}

      {section.full && (
        <div className={styles.searchFilterRow}>
          <input
            type="search"
            className={`${sharedStyles.wideSearch} ${styles.rowSearch}`}
            placeholder="Знайти подію…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Пошук події"
          />
          <div className={styles.typeChips} role="group" aria-label="Фільтр за типом події">
            {eventTypes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={typeFilter === value}
                className={`${styles.typeChip} ${typeFilter === value ? styles.typeChipActive : ''}`}
                onClick={() => setTypeFilter((cur) => (cur === value ? null : value))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={`${sharedStyles.body} ${styles.timeline} ${
          section.modal ? styles.timelineFull : ''
        } ${section.full ? styles.timelineWide : ''}`}
      >
        {epochs.length === 0 && canEdit ? (
          <div className={styles.epochEmpty}>
            <p className={sharedStyles.emptyMsg}>
              Ще немає епох. Створи першу, щоб групувати історію світу.
            </p>
            <Button size="small" onClick={() => setEpochDialog(true)} className={styles.epochBtn}>
              Створити епоху
            </Button>
          </div>
        ) : null}

        {grouped.length === 0 && events.length > 0 && (
          <p className={sharedStyles.emptyMsg}>Немає подій за обраними фільтрами.</p>
        )}

        {grouped.map(({ epoch, events: list }) => {
          const epEvents = list
          const allImportant = epEvents.every((e) => e.is_important)
          return (
            <div key={epoch ? epoch.id : 'none'} className={styles.epochBlock}>
              {epoch && (
                <div className={styles.epochHeader}>
                  <div className={styles.epochTopRow}>
                    <div className={styles.epochTitleRow}>
                      <div className={`${styles.epochMark} ${epoch.is_active ? styles.epochMarkActive : ''}`} />
                      <span className={styles.epochName}>{epoch.name}</span>
                      {epoch.is_active && (
                        <span className={styles.epochActiveBadge}>
                          <span className={styles.epochActiveDot} />
                          активна
                        </span>
                      )}
                    </div>
                    <div className={styles.epochHeaderActions}>
                      {canEdit && epoch.is_active && (
                        <Button
                          size="small"
                          variant="outlined"
                          className={styles.epochCloseBtn}
                          startIcon={<FlagIcon />}
                          onClick={() => setCloseEpoch(epoch)}
                        >
                          Завершити епоху
                        </Button>
                      )}
                      {canEdit && !epoch.is_active && !epoch.events_count && (
                        <IconButton
                          size="small"
                          onClick={() => deleteEpoch(epoch)}
                          className={styles.epochDeleteBtn}
                          aria-label="Видалити епоху"
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      )}
                    </div>
                  </div>
                  <div className={styles.epochMeta}>
                    <span>
                      {fmtDate(epoch.start_date)}
                      {epoch.end_date ? ` — ${fmtDate(epoch.end_date)}` : ''}
                    </span>
                    <span>· {list.length} подій</span>
                  </div>
                  {epoch.description && (
                    <p className={styles.epochDesc}>{epoch.description}</p>
                  )}
                </div>
              )}

              {epoch && list.length === 0 && !hasActiveFilters && (
                <div className={styles.epochEmptyState}>
                  <p className={styles.epochEmptyText}>Поки що подій немає.</p>
                  {canEdit && (
                    <Button
                      size="small"
                      className={styles.epochEmptyBtn}
                      startIcon={<AddIcon />}
                      onClick={() => openNew(epoch.id)}
                    >
                      Додати першу
                    </Button>
                  )}
                </div>
              )}

              {epoch && list.length === 0 && hasActiveFilters && (
                <p className={styles.epochEmptyText}>Немає подій за обраними фільтрами.</p>
              )}

              <div
                className={`${styles.epochTimeline} ${
                  allImportant && epEvents.length > 1 ? styles.timelineImportantGroup : ''
                }`}
              >
                {list.map((h, hi) => {
                  const Icon = typeIcons[h.event_type] || MoreHorizIcon
                  const color = typeColors[h.event_type] || typeColors.other
                  const label = typeLabels[h.event_type] || typeLabels.other
                  return (
                    <div
                      key={h.id}
                      className={`${styles.event} ${
                        hi === list.length - 1 ? styles.eventLast : ''
                      }`}
                    >
                      <div className={styles.eventTrack}>
                        <div
                          className={`${styles.node} ${h.is_important ? styles.nodeImportant : ''}`}
                          style={{ '--type-color': color }}
                        />
                        {hi < list.length - 1 && <div className={styles.rail} />}
                      </div>
                      <div className={styles.eventCardWrap}>
                        <div
                          className={`${styles.eventCard} ${
                            h.is_important ? styles.eventCardImportant : ''
                          }`}
                        >
                          <div className={styles.eventHeader}>
                            <div className={styles.eventLeft}>
                              <div className={styles.eventMeta}>
                                <span className={styles.eventDate}>
                                  {fmtDate(h.date)}
                                </span>
                                {h.game_day != null && (
                                  <span className={styles.gameDay}>· День {h.game_day}</span>
                                )}
                                {h.is_important && (
                                  <span className={styles.importantPill}>важлива</span>
                                )}
                              </div>
                              <div className={styles.eventTitle}>
                                <LocationBadgeText
                                  text={h.title}
                                  worldId={worldId}
                                  locations={locations}
                                />
                              </div>
                              <div
                                className={styles.typeBadge}
                                style={{ '--type-color': color }}
                              >
                                <Icon className={styles.typeBadgeIcon} />
                                {label}
                              </div>
                              {h.description && (
                                <p className={styles.eventDesc}>
                                  <LocationBadgeText
                                    text={h.description}
                                    worldId={worldId}
                                    locations={locations}
                                    small
                                  />
                                </p>
                              )}
                              {(h.image_url || h.coordinates || canEdit) && (
                                <div className={styles.eventExtras}>
                                  {h.image_url && (
                                    <>
                                      <button
                                        type="button"
                                        className={styles.thumbBtn}
                                        aria-label={`Відкрити фото: ${h.title}`}
                                        onClick={() => setLightbox({ url: h.image_url, title: h.title })}
                                      >
                                        <img
                                          src={h.image_url}
                                          alt={h.title}
                                          className={styles.thumb}
                                        />
                                      </button>
                                      {canEdit && (
                                        <IconButton
                                          size="small"
                                          aria-label="Видалити фото"
                                          title="Видалити фото"
                                          onClick={() => deleteImageMutation.mutate(h.id)}
                                          disabled={deleteImageMutation.isPending}
                                        >
                                          <DeleteOutlinedIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </>
                                  )}
                                  {canEdit && (
                                    <CardPhotoAdd
                                      worldId={worldId}
                                      eventId={h.id}
                                      label={h.image_url ? 'Замінити' : 'Додати фото'}
                                    />
                                  )}
                                  {h.coordinates && (
                                    <button
                                      type="button"
                                      className={styles.coordsPill}
                                      title="Копіювати координати"
                                      onClick={() => copyCoords(h.coordinates)}
                                    >
                                      <LocationOnOutlinedIcon style={{ width: 14, height: 14 }} />
                                      {h.coordinates.x} / {h.coordinates.y} / {h.coordinates.z} ⧉
                                    </button>
                                  )}
                                </div>
                              )}
                              {(h.participants_list || []).length > 0 && (
                                <div className={styles.participants}>
                                  {(h.participants_list || []).map((p, i) => (
                                    <Chip
                                      key={`${p}-${i}`}
                                      label={p}
                                      size="small"
                                      className={styles.participantChip}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className={styles.rowActions}>
                              <RelationshipButton
                                worldId={worldId}
                                sourceType="event"
                                sourceId={h.id}
                                name={h.title}
                                accent={accent}
                              />
                              {canEdit && (
                                <>
                                  <IconButton
                                    size="small"
                                    aria-label="Редагувати подію"
                                    onClick={() => openEdit(h)}
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    aria-label="Видалити подію"
                                    onClick={() => deleteEvent(h)}
                                  >
                                    <DeleteOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {events.length === 0 && (
          <p className={sharedStyles.emptyMsg}>
            Літопис порожній. Зафіксуй першу подію світу.
          </p>
        )}
      </div>

      <EpochDialog
        open={epochDialog}
        onClose={() => setEpochDialog(false)}
        accent={accent}
        onSubmit={(name, description) =>
          epochMutation.mutateAsync({ name, description }).then(() => setEpochDialog(false))
        }
      />
      <CloseEpochDialog
        open={closeEpoch !== null}
        onClose={() => setCloseEpoch(null)}
        epoch={closeEpoch}
        accent={accent}
        onSubmit={(name) =>
          epochCloseMutation
            .mutateAsync({ id: closeEpoch.id, name })
            .then(() => setCloseEpoch(null))
        }
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати подію' : 'Нова подія'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <div className={styles.titleRow}>
                <div className={styles.titleField}>
                  <LocationRichTextEditor
                    worldId={worldId}
                    label="Заголовок"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setPendingImage({ file, url: URL.createObjectURL(file) })
                      setRemoveImage(false)
                    }
                    e.target.value = ''
                  }}
                />
                <Button
                  size="small"
                  startIcon={<ImageOutlinedIcon />}
                  onClick={() => photoInputRef.current?.click()}
                  title={pendingImage ? 'Замінити зображення' : 'Додати зображення'}
                >
                  {pendingImage ? 'Замінити зображення' : 'Додати зображення'}
                </Button>
              </div>
              <LocationRichTextEditor
                worldId={worldId}
                label="Опис"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                minRows={2}
              />
              <TextField
                select
                label="Тип події"
                value={form.event_type}
                onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
              >
                {eventTypes.map(([v, label]) => (
                  <MenuItem key={v} value={v}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <div className={styles.coordRow}>
                {['x', 'y', 'z'].map((c) => (
                  <TextField
                    key={c}
                    label={c.toUpperCase()}
                    type="number"
                    value={form[`coord_${c}`]}
                    onChange={(e) => setForm((f) => ({ ...f, [`coord_${c}`]: e.target.value }))}
                    className={styles.coordField}
                  />
                ))}
              </div>
              <TextField
                label="Реальна дата"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Ігровий день"
                type="number"
                value={form.game_day}
                onChange={(e) => setForm((f) => ({ ...f, game_day: e.target.value }))}
              />
              <TextField
                select
                label="Епоха"
                value={form.epoch || ''}
                onChange={(e) => setForm((f) => ({ ...f, epoch: e.target.value }))}
              >
                {epochs.map((ep) => (
                  <MenuItem key={ep.id} value={ep.id} disabled={!editing && !ep.is_active}>
                    {ep.name}
                    {ep.is_active ? ' (активна)' : ' (завершена)'}
                  </MenuItem>
                ))}
                {epochs.length === 0 && <MenuItem value="">— епох поки немає —</MenuItem>}
              </TextField>
              <div className={styles.metaRow}>
                <Button
                  size="small"
                  startIcon={form.is_important ? <StarIcon /> : <StarBorderIcon />}
                  onClick={() => setForm((f) => ({ ...f, is_important: !f.is_important }))}
                  aria-pressed={form.is_important}
                  title="Позначити подію як важливу"
                  className={`${styles.importantBtn} ${form.is_important ? styles.importantBtnActive : ''}`}
                >
                  Важлива подія
                </Button>
                <TextField
                  select
                  label="Учасники"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addParticipant(e.target.value)
                  }}
                  className={styles.participantSelect}
                  disabled={availablePlayers.length === 0}
                  helperText={
                    players.length === 0
                      ? 'Спочатку додай гравців у картці «Гравці»'
                      : 'Обери гравця зі списку'
                  }
                >
                  {availablePlayers.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                  {availablePlayers.length === 0 && (
                    <MenuItem value="" disabled>
                      {players.length === 0 ? 'Гравців поки немає' : 'Усіх уже додано'}
                    </MenuItem>
                  )}
                </TextField>
              </div>
              {form.participants.length > 0 && (
                <div className={styles.participants}>
                  {form.participants.map((p, i) => (
                    <Chip
                      key={`${p}-${i}`}
                      label={p}
                      size="small"
                      onDelete={() => removeParticipant(p)}
                      deleteIcon={<CloseIcon fontSize="small" />}
                      className={styles.participantChip}
                    />
                  ))}
                </div>
              )}
              {(pendingImage?.url || (editing?.image_url && !removeImage)) && (
                <div className={styles.pendingPhoto}>
                  <img
                    src={pendingImage?.url || editing?.image_url}
                    alt={pendingImage?.url ? 'Превʼю' : 'Поточне фото'}
                  />
                  <IconButton
                    size="small"
                    aria-label={pendingImage?.url ? 'Прибрати фото' : 'Видалити поточне фото'}
                    onClick={() => {
                      if (pendingImage?.url) setPendingImage(null)
                      else setRemoveImage(true)
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              )}
              {editing?.image_url && removeImage && !pendingImage?.url && (
                <p className={styles.photoRemovedHint}>Фото буде видалено після збереження</p>
              )}
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setOpen(false)} className={sharedStyles.dialogBtnCancel}>
              Скасувати
            </Button>
            <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
              Зберегти
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        {lightbox && (
          <div className={styles.lightbox}>
            <IconButton className={styles.lightboxClose} onClick={() => setLightbox(null)}>
              <CloseIcon />
            </IconButton>
            <img src={lightbox.url} alt={lightbox.title || 'Фото події'} className={styles.lightboxImg} />
          </div>
        )}
      </Dialog>
    </div>
  )
}

function CardPhotoAdd({ worldId, eventId, label = 'Додати фото' }) {
  const qc = useQueryClient()
  const ref = useRef(null)
  const { notify } = useFeedback()
  const mutation = useMutation({
    mutationFn: (file) => {
      const data = new FormData()
      data.append('image', file)
      return api.patch(`/worlds/${worldId}/history/${eventId}/`, data)
    },
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
    onError: () => notify('Не вдалося завантажити фото'),
  })
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) mutation.mutate(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className={styles.addPhotoBtn}
        onClick={() => ref.current?.click()}
      >
        <AddPhotoAlternateIcon className={styles.addPhotoIcon} />
        {label}
      </button>
    </>
  )
}

function EpochDialog({ open, onClose, onSubmit, accent }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
    }
  }, [open])
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim())
    setName('')
    setDescription('')
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Нова епоха</DialogTitle>
        <DialogContent>
          <div className={sharedStyles.formFields}>
            <TextField
              label="Назва епохи"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              fullWidth
              inputProps={{ maxLength: TITLE_MAX }}
            />
            <TextField
              label="Опис (необов'язково)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
            Створити
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function CloseEpochDialog({ open, onClose, epoch, onSubmit, accent }) {
  const [name, setName] = useState('')
  useEffect(() => {
    if (open) setName('')
  }, [open])
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim())
    setName('')
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Завершити епоху «{epoch?.name}»</DialogTitle>
        <DialogContent>
          <div className={sharedStyles.formFields}>
            <TextField
              label="Назва нової епохи"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              fullWidth
              inputProps={{ maxLength: TITLE_MAX }}
            />
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
            Почати нову
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}