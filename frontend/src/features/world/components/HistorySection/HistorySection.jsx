import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Switch,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import CloseIcon from '@mui/icons-material/Close'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import FlagIcon from '@mui/icons-material/Flag'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
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
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './HistorySection.module.css'

const MS_IN_DAY = 86400000

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

function gameDayForDate(dateValue, world) {
  const start = world?.start_date || world?.created_at?.slice(0, 10)
  if (!start) return null
  const d = new Date(`${dateValue}T12:00:00`)
  const s = new Date(`${start}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.round((d - s) / MS_IN_DAY)) + 1
}

function worldAgeInDays(world) {
  const start = world?.start_date || world?.created_at?.slice(0, 10)
  if (!start) return 0
  const s = new Date(`${start}T12:00:00`)
  const now = new Date()
  if (Number.isNaN(s.getTime())) return 0
  return Math.max(0, Math.floor((now - s) / MS_IN_DAY)) + 1
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
  const [lightbox, setLightbox] = useState(null)
  const [filters, setFilters] = useState({ importantOnly: false, epoch: '', type: '' })
  const [sortBy, setSortBy] = useState('date')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [epochDialog, setEpochDialog] = useState(false)
  const [closeEpoch, setCloseEpoch] = useState(null)
  const canEdit = userRole && userRole !== 'viewer'

  const { data: events = [] } = useQuery({
    queryKey: ['history', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/history/`).then((r) => r.data),
  })
  const { data: epochs = [] } = useQuery({
    queryKey: ['epochs', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/epochs/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
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
  })
  const imageMutation = useMutation({
    mutationFn: ({ id, file }) =>
      api.patch(
        `/worlds/${worldId}/history/${id}/`,
        { image: file },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ),
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
  })
  const epochMutation = useMutation({
    mutationFn: (payload) => api.post(`/worlds/${worldId}/epochs/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['epochs', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })
  const epochCloseMutation = useMutation({
    mutationFn: ({ id, name }) => api.post(`/worlds/${worldId}/epochs/${id}/close/`, { name }),
    onSuccess: () => {
      qc.invalidateQueries(['epochs', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
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
    if (pendingImage?.url) URL.revokeObjectURL(pendingImage.url)
  }, [pendingImage])

  const activeEpochObj = useMemo(
    () => epochs.find((e) => e.is_active) || null,
    [epochs],
  )

  const knownParticipants = useMemo(
    () => Array.from(new Set(events.flatMap((e) => e.participants_list || []))),
    [events],
  )

  const openNew = () => {
    setEditing(null)
    setForm({ ...empty, epoch: activeEpochObj?.id || '' })
    setPendingImage(null)
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
      epoch: h.epoch || activeEpochObj?.id || '',
      coord_x: h.coordinates?.x ?? '',
      coord_y: h.coordinates?.y ?? '',
      coord_z: h.coordinates?.z ?? '',
      participants: h.participants_list || [],
    })
    setPendingImage(null)
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
    const payload = {
      title: form.title,
      description: form.description,
      date: form.date,
      event_type: form.event_type,
      is_important: form.is_important,
      epoch: form.epoch || activeEpochObj?.id || null,
      participants: form.participants.join(', '),
    }
    if (form.game_day !== '') payload.game_day = Number(form.game_day)
    if (form.coord_x !== '' && form.coord_y !== '' && form.coord_z !== '') {
      payload.coord_x = Number(form.coord_x)
      payload.coord_y = Number(form.coord_y)
      payload.coord_z = Number(form.coord_z)
    }
    mutation.mutateAsync(payload).then(({ data }) => {
      if (pendingImage?.file && data?.id) {
        imageMutation.mutate({ id: data.id, file: pendingImage.file })
      }
      setOpen(false)
    })
  }

  const filtered = useMemo(() => {
    let list = [...events]
    if (filters.importantOnly) list = list.filter((e) => e.is_important)
    if (filters.type) list = list.filter((e) => e.event_type === filters.type)
    let epochId = filters.epoch
    if (epochId === '') epochId = activeEpochObj ? String(activeEpochObj.id) : ''
    if (epochId && epochId !== 'all') list = list.filter((e) => String(e.epoch) === String(epochId))
    if (filters.participant) list = list.filter((e) => (e.participants_list || []).includes(filters.participant))
    list.sort((a, b) => {
      if (sortBy === 'game_day') {
        const ad = a.game_day ?? Number.MAX_SAFE_INTEGER
        const bd = b.game_day ?? Number.MAX_SAFE_INTEGER
        return ad - bd || new Date(a.date) - new Date(b.date)
      }
      return new Date(a.date) - new Date(b.date)
    })
    return list
  }, [events, filters, activeEpochObj, sortBy])

  const grouped = useMemo(() => {
    const byEpoch = new Map()
    for (const e of filtered) {
      const key = String(e.epoch || 'none')
      if (!byEpoch.has(key)) byEpoch.set(key, [])
      byEpoch.get(key).push(e)
    }
    const result = []
    const epochMap = new Map(epochs.map((x) => [String(x.id), x]))
    for (const [key, list] of byEpoch) {
      const ep = epochMap.get(key)
      result.push({ epoch: ep || null, events: list })
    }
    result.sort((a, b) => {
      const ad = a.epoch ? new Date(a.epoch.start_date) : new Date(0)
      const bd = b.epoch ? new Date(b.epoch.start_date) : new Date(0)
      return ad - bd
    })
    return result
  }, [filtered, epochs])

  const stats = useMemo(() => {
    const bossCount = events.filter((e) => e.event_type === 'boss').length
    return {
      ageDays: worldAgeInDays(world),
      total: events.length,
      bosses: bossCount,
      epochs: epochs.length,
    }
  }, [events, epochs, world])

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Історія світу ({events.length})</h3>
        {canEdit && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
            Нова подія
          </Button>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <CalendarMonthIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.ageDays}</span>
          <span className={styles.statLabel}>днів світу</span>
        </div>
        <div className={styles.stat}>
          <AutoAwesomeIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>подій</span>
        </div>
        <div className={styles.stat}>
          <LocalFireDepartmentIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.bosses}</span>
          <span className={styles.statLabel}>босів</span>
        </div>
        <div className={styles.stat}>
          <MenuBookIcon className={styles.statIcon} />
          <span className={styles.statValue}>{stats.epochs}</span>
          <span className={styles.statLabel}>епох</span>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterToggle}>
          <IconButton
            size="small"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`${styles.filterIconBtn} ${filtersOpen ? styles.filterIconBtnOpen : ''}`}
            aria-label="Фільтри"
          >
            <FilterAltIcon />
          </IconButton>
          <span className={styles.filterToggleLabel}>Фільтри</span>
        </div>
        <div
          className={`${styles.filterGroup} ${
            filtersOpen ? styles.filterGroupOpen : ''
          }`}
        >
          <TextField
            select
            size="small"
            label="Тип події"
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className={styles.filterSelect}
          >
            <MenuItem value="">Усі типи</MenuItem>
            {eventTypes.map(([v, label]) => (
              <MenuItem key={v} value={v}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Епоха"
            value={filters.epoch}
            onChange={(e) => setFilters((f) => ({ ...f, epoch: e.target.value }))}
            className={styles.filterSelect}
          >
            <MenuItem value="all">Усі епохи</MenuItem>
            <MenuItem value="">
              {activeEpochObj ? `Поточна (${activeEpochObj.name})` : 'Без епохи'}
            </MenuItem>
            {epochs.map((ep) => (
              <MenuItem key={ep.id} value={String(ep.id)}>
                {ep.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Учасник"
            value={filters.participant || ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, participant: e.target.value || undefined }))
            }
            className={styles.filterSelect}
          >
            <MenuItem value="">Усі учасники</MenuItem>
            {knownParticipants.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <div className={styles.filterSwitches}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={filters.importantOnly}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, importantOnly: e.target.checked }))
                  }
                />
              }
              label="Важливі"
              className={styles.importantToggle}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={sortBy === 'game_day'}
                  onChange={(e) => setSortBy(e.target.checked ? 'game_day' : 'date')}
                />
              }
              label="Ігровий день"
              className={styles.sortToggle}
            />
          </div>
        </div>
      </div>

      <div
        className={`${sharedStyles.body} ${styles.timeline} ${
          section.modal ? styles.timelineFull : ''
        }`}
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
                      {new Date(epoch.start_date).toLocaleDateString('uk-UA')}
                      {epoch.end_date ? ` — ${new Date(epoch.end_date).toLocaleDateString('uk-UA')}` : ''}
                    </span>
                    <span>· {epoch.events_count} подій</span>
                  </div>
                  {epoch.description && (
                    <p className={styles.epochDesc}>{epoch.description}</p>
                  )}
                </div>
              )}

              {epoch && list.length === 0 && (
                <div className={styles.epochEmptyState}>
                  <p className={styles.epochEmptyText}>Поки що подій немає.</p>
                  {canEdit && (
                    <Button
                      size="small"
                      className={styles.epochEmptyBtn}
                      startIcon={<AddIcon />}
                      onClick={openNew}
                    >
                      Додати першу
                    </Button>
                  )}
                </div>
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
                                  {new Date(h.date).toLocaleDateString('uk-UA')}
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
                              {(h.image_url || h.coordinates || (canEdit && !h.image_url)) && (
                                <div className={styles.eventExtras}>
                                  {h.image_url && (
                                    <button
                                      type="button"
                                      className={styles.thumbBtn}
                                      onClick={() => setLightbox(h.image_url)}
                                    >
                                      <img
                                        src={h.image_url}
                                        alt={h.title}
                                        className={styles.thumb}
                                      />
                                    </button>
                                  )}
                                  {canEdit && !h.image_url && (
                                    <CardPhotoAdd worldId={worldId} eventId={h.id} />
                                  )}
                                  {h.coordinates && (
                                    <span className={styles.coordsPill}>
                                      <LocationOnOutlinedIcon style={{ width: 14, height: 14 }} />
                                      {h.coordinates.x} / {h.coordinates.y} / {h.coordinates.z}
                                    </span>
                                  )}
                                </div>
                              )}
                              {(h.participants_list || []).length > 0 && (
                                <div className={styles.participants}>
                                  {(h.participants_list || []).map((p) => (
                                    <Chip
                                      key={p}
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
                                  <IconButton size="small" onClick={() => openEdit(h)}>
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => deleteEvent(h)}>
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
        onSubmit={(name, description) =>
          epochMutation.mutateAsync({ name, description }).then(() => setEpochDialog(false))
        }
      />
      <CloseEpochDialog
        open={closeEpoch !== null}
        onClose={() => setCloseEpoch(null)}
        epoch={closeEpoch}
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
              <LocationRichTextEditor
                worldId={worldId}
                label="Заголовок"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
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
                onChange={(e) => {
                  const date = e.target.value
                  setForm((f) => ({
                    ...f,
                    date,
                    game_day: gameDayForDate(date, world) ?? f.game_day,
                  }))
                }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Ігровий день (авто, можна змінити)"
                type="number"
                value={form.game_day}
                onChange={(e) => setForm((f) => ({ ...f, game_day: e.target.value }))}
                helperText={
                  world?.start_date
                    ? `Розраховується від старту світу (${world.start_date}).`
                    : 'Встанови дату старту світу, щоб рахувати автоматично.'
                }
              />
              <TextField
                select
                label="Епоха"
                value={form.epoch || ''}
                onChange={(e) => setForm((f) => ({ ...f, epoch: e.target.value }))}
              >
                {epochs.map((ep) => (
                  <MenuItem key={ep.id} value={ep.id}>
                    {ep.name}
                    {ep.is_active ? ' (активна)' : ''}
                  </MenuItem>
                ))}
                {epochs.length === 0 && <MenuItem value="">— епох поки немає —</MenuItem>}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_important}
                    onChange={(e) => setForm((f) => ({ ...f, is_important: e.target.checked }))}
                  />
                }
                label="Важлива подія"
              />
              <ParticipantsInput
                participants={form.participants}
                suggestions={knownParticipants}
                onAdd={addParticipant}
                onRemove={removeParticipant}
              />
              <PhotoInput pending={pendingImage} onPick={setPendingImage} />

              <Tooltip title="Скоро — буде доступно пізніше">
                <span>
                  <Button disabled className={styles.aiButton}>
                    ✨ Згенерувати опис
                  </Button>
                </span>
              </Tooltip>
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
            <img src={lightbox} alt="Подія" className={styles.lightboxImg} />
          </div>
        )}
      </Dialog>
    </div>
  )
}

function CardPhotoAdd({ worldId, eventId }) {
  const qc = useQueryClient()
  const ref = { current: null }
  const mutation = useMutation({
    mutationFn: (file) =>
      api.patch(
        `/worlds/${worldId}/history/${eventId}/`,
        { image: file },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ),
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
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
        Додати фото
      </button>
    </>
  )
}

function PhotoInput({ pending, onPick }) {
  const ref = { current: null }
  return (
    <div className={styles.photoInput}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick({ file, url: URL.createObjectURL(file) })
          e.target.value = ''
        }}
      />
      <Button
        variant="outlined"
        onClick={() => ref.current?.click()}
        startIcon={<ImageOutlinedIcon />}
      >
        {pending ? 'Замінити зображення' : 'Додати зображення'}
      </Button>
      {pending?.url && (
        <div className={styles.pendingPhoto}>
          <img src={pending.url} alt="Прев'ю" />
          <IconButton size="small" onClick={() => onPick(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      )}
    </div>
  )
}

function ParticipantsInput({ participants, suggestions, onAdd, onRemove }) {
  const [value, setValue] = useState('')
  const filtered = suggestions.filter((s) => !participants.includes(s))
  return (
    <div>
      <TextField
        label="Учасники"
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (value.trim()) onAdd(value)
            setValue('')
          }
        }}
        helperText="Введи ім'я та натисни Enter"
      />
      {filtered.length > 0 && value && (
        <div className={styles.suggestions}>
          {filtered
            .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
            .map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                onClick={() => {
                  onAdd(s)
                  setValue('')
                }}
                className={styles.suggestionChip}
              />
            ))}
        </div>
      )}
      <div className={styles.participants}>
        {participants.map((p) => (
          <Chip
            key={p}
            label={p}
            size="small"
            onDelete={() => onRemove(p)}
            className={styles.participantChip}
          />
        ))}
      </div>
    </div>
  )
}

function EpochDialog({ open, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim())
    setName('')
    setDescription('')
  }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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

function CloseEpochDialog({ open, onClose, epoch, onSubmit }) {
  const [name, setName] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim())
    setName('')
  }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
