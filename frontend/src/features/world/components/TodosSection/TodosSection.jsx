import { useLayoutEffect, useRef, useState } from 'react'
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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './TodosSection.module.css'

const priorities = {
  low: ['#B7EAC7', 'Низький'],
  medium: ['#FFE29A', 'Середній'],
  high: ['#FFB199', 'Високий'],
  urgent: ['#FF8A80', 'Терміновий'],
}
const empty = { title: '', description: '', priority: 'medium' }

function cleanTodoPayload(form, editing) {
  return {
    title: (form.title || '').trim(),
    description: form.description || '',
    priority: form.priority || 'medium',
    ...(editing ? {} : { is_done: false }),
  }
}

export default function TodosSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [priorityFilter, setPriorityFilter] = useState(null)
  const [search, setSearch] = useState('')
  const canEdit = userRole && userRole !== 'viewer'

  const { data: allTodos = [], isLoading } = useQuery({
    queryKey: ['todos', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/todos/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const todos = allTodos.filter((t) => !t.project)
  const sortedTodos = [...todos].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || b.id - a.id,
  )
  const q = search.trim().toLowerCase()
  const searched = q
    ? sortedTodos.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q),
      )
    : sortedTodos
  const visibleTodos = priorityFilter
    ? searched.filter((t) => t.priority === priorityFilter)
    : searched
  // Перетягування як у проєкті: FLIP-анімація + збереження порядку.
  // Вимкнено під фільтром пріоритету, щоб не плутати порядок.
  const dndEnabled = canEdit && !priorityFilter
  const [drag, setDrag] = useState(null)
  const flipSnapshotRef = useRef(null)
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
        old.map((x) => (x.id === todo.id ? { ...x, is_done: !todo.is_done } : x)),
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
    visibleTodos.filter((t) => t.is_done).forEach(deleteTodo)
  }

  const moveTodo = async (fromId, toId) => {
    const ids = sortedTodos.map((t) => t.id)
    const from = ids.indexOf(fromId)
    if (from === -1) return
    ids.splice(from, 1)
    const to = toId == null ? ids.length : ids.indexOf(toId)
    if (to === -1) return
    ids.splice(to, 0, fromId)
    if (ids.join(',') === sortedTodos.map((t) => t.id).join(',')) return
    const todosKey = ['todos', String(worldId)]
    const prev = qc.getQueryData(todosKey)
    qc.setQueryData(todosKey, (old) =>
      (old ?? []).map((t) => {
        const i = ids.indexOf(t.id)
        return i === -1 ? t : { ...t, order: i }
      }),
    )
    try {
      await api.post(`/worlds/${worldId}/todos/reorder/`, { project: null, ids })
    } catch {
      if (prev) qc.setQueryData(todosKey, prev)
    } finally {
      qc.invalidateQueries(todosKey)
      qc.invalidateQueries(['world', String(worldId)])
    }
  }

  // FLIP-анімація як в оверлеї: знімок позицій ДО зміни порядку,
  // після рендеру рядки анімовано «перелітають» на нові місця.
  const snapshotTodoRects = () => {
    const snapshot = {}
    sortedTodos.forEach((t) => {
      const el = document.getElementById(`todos-slot-${t.id}`)
      if (el) snapshot[t.id] = el.getBoundingClientRect()
    })
    flipSnapshotRef.current = snapshot
  }

  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null
    const moves = []
    Object.keys(snapshot).forEach((key) => {
      const el = document.getElementById(`todos-slot-${key}`)
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

  const onTodoDragStart = (e, id) => {
    if (!dndEnabled) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(id))
    requestAnimationFrame(() => setDrag({ id }))
  }

  const onTodoDragOver = (e, id) => {
    if (!drag || !dndEnabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDrag((d) => (d && d.over !== id ? { ...d, over: id } : d))
  }

  const onTodoDrop = (e, targetId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!drag || !dndEnabled) return
    const sourceId = drag.id
    setDrag(null)
    if (sourceId === targetId) return
    snapshotTodoRects()
    moveTodo(sourceId, targetId)
  }

  const onTodoDropEnd = (e) => {
    e.preventDefault()
    if (!drag || !dndEnabled) return
    const sourceId = drag.id
    setDrag(null)
    snapshotTodoRects()
    moveTodo(sourceId, null)
  }

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (t) => {
    setEditing(t)
    setForm({
      title: t.title || '',
      description: t.description || '',
      priority: t.priority || 'medium',
    })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    if (!(form.title || '').trim()) return
    mutation.mutateAsync(cleanTodoPayload(form, editing)).then(() => setOpen(false))
  }
  const done = todos.filter((t) => t.is_done).length
  const percent = todos.length ? Math.round((done / todos.length) * 100) : 0

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Todo-лист ({done}/{todos.length})
        </h3>
        <div className={styles.headerActions}>
          {done > 0 && (
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
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openNew}
            >
              Нове todo
            </Button>
          )}
        </div>
      </div>

      {section.full && todos.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryBar}>
            <div className={styles.summaryFill} style={{ width: `${percent}%` }} />
          </div>
          <span className={styles.summaryText}>
            Виконано {done} з {todos.length} ({percent}%)
          </span>
        </div>
      )}

      {(section.full || section.modal) && (
        <div className={styles.priorityFilters} role="group" aria-label="Фільтр за пріоритетом">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук завдань…"
            aria-label="Пошук завдань"
            className={styles.searchInput}
          />
          {Object.entries(priorities).map(([value, [color, label]]) => (
            <button
              key={value}
              type="button"
              aria-pressed={priorityFilter === value}
              className={`${styles.priorityFilterChip} ${priorityFilter === value ? styles.priorityFilterChipActive : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === value ? null : value)}
            >
              <span className={styles.priorityDot} style={{ background: color }} />
              {label}
            </button>
          ))}
        </div>
      )}

      <div
        className={`${sharedStyles.body} ${styles.todoList} ${
          section.modal ? styles.todoListFull : ''
        } ${section.full ? styles.todoListWide : ''}`}
        onDragOver={dndEnabled ? (e) => e.preventDefault() : undefined}
        onDrop={dndEnabled ? onTodoDropEnd : undefined}
      >
        {visibleTodos.map((t) => {
          const [dot, label] = priorities[t.priority] || priorities.medium
          return (
            <div
              key={t.id}
              id={`todos-slot-${t.id}`}
              className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''} ${
                drag?.id === t.id ? styles.todoDragging : ''
              } ${drag?.over === t.id ? styles.todoDragOver : ''}`}
              draggable={dndEnabled}
              onDragStart={dndEnabled ? (e) => onTodoDragStart(e, t.id) : undefined}
              onDragOver={dndEnabled ? (e) => onTodoDragOver(e, t.id) : undefined}
              onDrop={dndEnabled ? (e) => onTodoDrop(e, t.id) : undefined}
              onDragEnd={() => setDrag(null)}
              onClick={canEdit ? () => toggle.mutate(t) : undefined}
              onKeyDown={canEdit ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.mutate(t) } } : undefined}
              role={canEdit ? 'checkbox' : undefined}
              aria-checked={canEdit ? !!t.is_done : undefined}
              tabIndex={canEdit ? 0 : undefined}
              style={canEdit ? undefined : { cursor: 'default' }}
            >
              {dndEnabled && (
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
                  <div className={styles.todoTitleRow}>
                    <div className={styles.todoTitle}>
                      <LocationBadgeText text={t.title} worldId={worldId} locations={locations} />
                    </div>
                  </div>
                  {t.description && (
                    <div className={styles.todoDesc}>
                      <LocationBadgeText
                        text={t.description}
                        worldId={worldId}
                        locations={locations}
                        small
                      />
                    </div>
                  )}
                </div>
                <span className={styles.priorityChip}>
                  <span className={styles.priorityDot} style={{ background: dot }} />
                  {label}
                </span>
              <div className={styles.rowActions}>
                <RelationshipButton
                  worldId={worldId}
                  sourceType="todo"
                  sourceId={t.id}
                  name={t.title}
                  accent={accent}
                />
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
        {isLoading ? (
          <p className={sharedStyles.emptyMsg}>Завантаження завдань…</p>
        ) : visibleTodos.length === 0 && (
          <p className={sharedStyles.emptyMsg}>
            {todos.length === 0
              ? 'Плани ще не складені. Додай перше завдання.'
              : 'Нічого не знайдено. Спробуй інший пошук або пріоритет.'}
          </p>
        )}
      </div>

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
    </div>
  )
}
