import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import api from '../../../../api'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './PlannerSection.module.css'

const priorities = {
  low: ['#B7EAC7', 'Низький'],
  medium: ['#FFE29A', 'Середній'],
  high: ['#FFB199', 'Високий'],
  urgent: ['#FF8A80', 'Терміновий'],
}
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const pad2 = (n) => String(n).padStart(2, '0')
// Локальна дата YYYY-MM-DD (toISOString дає UTC і бреше біля опівночі).
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayStr = () => toISODate(new Date())
const tomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toISODate(d)
}
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const monthLabel = (d) => {
  const s = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const empty = () => ({ title: '', description: '', priority: 'medium', due_date: todayStr() })

const fmtDate = (iso, opts) => {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('uk-UA', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PlannerSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [filter, setFilter] = useState(null)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const canEdit = userRole && userRole !== 'viewer'
  // Перетягування задачі на день календаря змінює її дедлайн.
  // Календар є лише в модалці — там і вмикаємо DnD.
  const dndOn = canEdit && section.modal
  const [dragId, setDragId] = useState(null)
  const [overDate, setOverDate] = useState(null)
  const flipSnapshotRef = useRef(null)

  const todosKey = ['todos', String(worldId)]
  const worldKey = ['world', String(worldId)]

  const { data: todos = [] } = useQuery({
    queryKey: ['todos', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/todos/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)

  const planned = useMemo(() => {
    const items = todos
      .filter((t) => t.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    if (filter === 'today') return items.filter((t) => t.due_date === todayStr())
    if (filter === 'tomorrow') return items.filter((t) => t.due_date === tomorrowStr())
    if (typeof filter === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filter)) {
      return items.filter((t) => t.due_date === filter)
    }
    return items
  }, [todos, filter])

  const countsByDate = useMemo(() => {
    // Лічильники днів — лише відкриті завдання.
    const map = {}
    todos.forEach((t) => {
      if (t.due_date && !t.is_done) map[t.due_date] = (map[t.due_date] || 0) + 1
    })
    return map
  }, [todos])

  const monthCells = useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const lead = (new Date(y, m, 1).getDay() + 6) % 7
    const days = new Date(y, m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d))
    return cells
  }, [month])
  const localToday = toISODate(new Date())

  const pickDay = (iso) => {
    setFilter(filter === iso ? null : iso)
    if (iso) setMonth(startOfMonth(new Date(`${iso}T12:00:00`)))
  }

  const overdue = (t) => {
    if (!t.due_date || t.is_done) return false
    return new Date(t.due_date) < new Date(new Date().toDateString())
  }

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/todos/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/todos/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['todos', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const toggle = useMutation({
    mutationFn: (todo) =>
      api.patch(`/worlds/${worldId}/todos/${todo.id}/`, { is_done: !todo.is_done }),
    onMutate: async (todo) => {
      await qc.cancelQueries(['todos', String(worldId)])
      const prev = qc.getQueryData(['todos', String(worldId)])
      qc.setQueryData(['todos', String(worldId)], (old) =>
        (old ?? []).map((x) => (x.id === todo.id ? { ...x, is_done: !todo.is_done } : x)),
      )
      return { prev }
    },
    onError: (_err, _todo, ctx) => qc.setQueryData(['todos', String(worldId)], ctx.prev),
    onSettled: () => {
      qc.invalidateQueries(['todos', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const undo = useUndo()
  const deleteTodo = (t) =>
    undo.deleteItem({
      id: t.id,
      url: `/worlds/${worldId}/todos/${t.id}/`,
      queryKeys: [
        ['todos', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Завдання «${t.title}» видалено`,
      nouns: ['завдання', 'завдання', 'завдань'],
    })

  const deleteDone = () => {
    planned.filter((t) => t.is_done).forEach(deleteTodo)
  }

  const snapshotPlannerRects = () => {
    const snapshot = {}
    planned.forEach((t) => {
      const el = document.getElementById(`planner-slot-${t.id}`)
      if (el) snapshot[t.id] = el.getBoundingClientRect()
    })
    flipSnapshotRef.current = snapshot
  }

  // FLIP-анімація як у проєкті: після зміни дати рядок плавно
  // перелітає на нове місце (або зникає з-під фільтра дня).
  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null
    const moves = []
    Object.keys(snapshot).forEach((key) => {
      const el = document.getElementById(`planner-slot-${key}`)
      if (!el) return
      const before = snapshot[key]
      const after = el.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      moves.push({ el, dx, dy })
    })
    if (moves.length === 0) return
    moves.forEach(({ el, dx, dy }) => {
      el.style.willChange = 'transform'
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
    })
    // eslint-disable-next-line no-unused-expressions
    document.body.offsetHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moves.forEach(({ el }) => {
          el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          el.style.transform = ''
          const cleanup = () => {
            el.style.transition = ''
            el.style.willChange = ''
            el.removeEventListener('transitionend', cleanup)
          }
          el.addEventListener('transitionend', cleanup)
        })
      })
    })
  }, [todos])

  const reschedule = async (id, iso) => {
    const t = todos.find((x) => x.id === id)
    if (!t || t.due_date === iso) return
    snapshotPlannerRects()
    const prev = qc.getQueryData(todosKey)
    qc.setQueryData(todosKey, (old) =>
      (old ?? []).map((x) => (x.id === id ? { ...x, due_date: iso } : x)),
    )
    try {
      await api.patch(`/worlds/${worldId}/todos/${id}/`, { due_date: iso })
    } catch {
      if (prev) qc.setQueryData(todosKey, prev)
    } finally {
      qc.invalidateQueries(todosKey)
      qc.invalidateQueries(worldKey)
    }
  }

  const onTaskDragStart = (e, id) => {
    if (!dndOn) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(id))
    requestAnimationFrame(() => setDragId(id))
  }

  const clearTaskDrag = () => {
    setDragId(null)
    setOverDate(null)
  }

  const openNew = () => {
    setEditing(null)
    setForm(empty())
    setOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ ...t })
    setOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    if (mutation.isPending) return
    const payload = { ...form }
    if (editing) delete payload.is_done
    mutation.mutate(payload, { onSuccess: () => setOpen(false) })
  }

  const done = planned.filter((t) => t.is_done).length
  const allDated = todos.filter((t) => t.due_date)
  const doneAll = allDated.filter((t) => t.is_done).length

  const renderCalendar = () => (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.calNavBtn}
          aria-label="Попередній місяць"
            onClick={() => setMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon fontSize="small" />
        </button>
        <span className={styles.calTitle}>{monthLabel(month)}</span>
        <button
          type="button"
          className={styles.calNavBtn}
          aria-label="Наступний місяць"
            onClick={() => setMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon fontSize="small" />
        </button>
        <button
          type="button"
          className={styles.calTodayBtn}
          onClick={() => {
            setMonth(startOfMonth(new Date()))
            setFilter(null)
          }}
        >
          Сьогодні
        </button>
      </div>
      <div className={styles.calGrid} role="grid" aria-label="Календар завдань">
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.calWeekday}>
            {d}
          </span>
        ))}
        {monthCells.map((date, i) => {
          if (!date) return <span key={`e${i}`} className={styles.calEmpty} />
          const iso = toISODate(date)
          const count = countsByDate[iso] || 0
          return (
            <button
              key={iso}
              type="button"
              className={`${styles.calDay} ${iso === localToday ? styles.calToday : ''} ${
                filter === iso ? styles.calSelected : ''
              } ${count > 0 ? styles.calHasTodos : ''} ${
                overDate === iso ? styles.calDropOver : ''
              }`}
              onClick={() => pickDay(iso)}
              onDragOver={
                dndOn
                  ? (e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setOverDate(iso)
                    }
                  : undefined
              }
              onDragLeave={
                dndOn ? () => setOverDate((cur) => (cur === iso ? null : cur)) : undefined
              }
              onDrop={
                dndOn
                  ? (e) => {
                      e.preventDefault()
                      if (dragId != null) reschedule(dragId, iso)
                      clearTaskDrag()
                    }
                  : undefined
              }
              aria-pressed={filter === iso}
              aria-label={`${iso}, відкритих завдань: ${count}`}
            >
              <span className={styles.calNum}>{date.getDate()}</span>
              {count > 0 && <span className={styles.calCount}>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className={`${sharedStyles.card} ${section.full ? styles.plannerFullCard : ''}`}
      style={{ '--accent': accent }}
    >
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Планер ({doneAll}/{allDated.length})
        </h3>
        <div className={styles.headerActions}>
          {done > 0 && canEdit && (
            <button
              type="button"
              className={styles.filterBtnDeleteDone}
              onClick={deleteDone}
              title="Видалити виконані"
              aria-label="Видалити виконані"
            >
              <span className={styles.deleteDoneIcon}>
                <DeleteOutlinedIcon fontSize="small" />
                <CheckIcon className={styles.deleteDoneCheck} />
              </span>
            </button>
          )}
          {canEdit && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
              Нове завдання
            </Button>
          )}
        </div>
      </div>

      <div className={styles.filters}>
        {[
          [null, 'Усі'],
          ['today', 'Сьогодні'],
          ['tomorrow', 'Завтра'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            className={`${styles.filterBtn} ${filter === value ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {section.modal && renderCalendar()}

      <div
        className={`${sharedStyles.body} ${styles.todoList} ${
          section.modal ? styles.todoListFull : ''
        }`}
      >
        {planned.map((t) => {
          const [dot, label] = priorities[t.priority]
          const isOverdue = overdue(t)
          return (
            <div
              key={t.id}
              id={`planner-slot-${t.id}`}
              className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''} ${isOverdue ? styles.todoItemOverdue : ''} ${
                dragId === t.id ? styles.todoDragging : ''
              }`}
              draggable={dndOn}
              onDragStart={dndOn ? (e) => onTaskDragStart(e, t.id) : undefined}
              onDragEnd={clearTaskDrag}
              onClick={canEdit ? () => toggle.mutate(t) : undefined}
              style={canEdit ? undefined : { cursor: 'default' }}
              role={canEdit ? 'checkbox' : undefined}
              aria-checked={canEdit ? t.is_done : undefined}
              tabIndex={canEdit ? 0 : undefined}
              onKeyDown={
                canEdit
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggle.mutate(t)
                      }
                    }
                  : undefined
              }
            >
              {dndOn && (
                <DragIndicatorIcon className={styles.dragHandle} aria-hidden="true" />
              )}
              <Checkbox
                className={styles.todoCheckbox}
                checked={t.is_done}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggle.mutate(t)}
                size="small"
              />
              <div className={styles.todoText}>
                <div className={styles.todoTitle}>
                  <LocationBadgeText text={t.title} worldId={worldId} locations={locations} />
                </div>
                {t.description && (
                  <div className={styles.todoDesc}>
                    <LocationBadgeText text={t.description} worldId={worldId} locations={locations} small />
                  </div>
                )}
              </div>
              <div className={styles.todoChips}>
                <span className={styles.priorityChip}>
                  <span className={styles.priorityDot} style={{ background: dot }} />
                  {label}
                </span>
                <span
                  className={`${styles.dueChip} ${isOverdue ? styles.dueChipOverdue : ''}`}
                  title={isOverdue ? `Прострочено: ${fmtDate(t.due_date)}` : fmtDate(t.due_date)}
                >
                  <CalendarTodayIcon sx={{ fontSize: 13 }} />
                  {fmtDate(t.due_date, { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className={styles.rowActions}>
                {canEdit && (
                  <>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(t)
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTodo(t)
                      }}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {planned.length === 0 &&
          (allDated.length > 0 ? (
            <div className={styles.emptyFiltered}>
              <p className={sharedStyles.emptyMsg}>На цей день завдань немає.</p>
              <button
                type="button"
                className={styles.emptyReset}
                onClick={() => setFilter(null)}
              >
                Показати всі
              </button>
            </div>
          ) : (
            <p className={sharedStyles.emptyMsg}>Плани ще не складені. Додай перше завдання.</p>
          ))}
      </div>

      <Dialog
        open={open}
        onClose={() => !mutation.isPending && setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати завдання' : 'Нове завдання'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <LocationRichTextEditor
                worldId={worldId}
                label="Назва"
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
                label="Пріоритет"
                select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {Object.entries(priorities).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v[1]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Дата"
                type="date"
                value={form.due_date || ''}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button
              onClick={() => setOpen(false)}
              className={sharedStyles.dialogBtnCancel}
              disabled={mutation.isPending}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              className={sharedStyles.dialogBtnSubmit}
              disabled={mutation.isPending}
            >
              Зберегти
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
