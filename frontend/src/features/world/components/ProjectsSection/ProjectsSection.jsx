import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Checkbox, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './ProjectsSection.module.css'

const statusLabels = {
  draft: 'Чернетка',
  planning: 'Планування',
  in_progress: 'В процесі',
  completed: 'Завершено',
}

const statusColors = {
  draft: '#B0B0B0',
  planning: '#FFE29A',
  in_progress: '#7DD3FC',
  completed: '#8FE3A0',
}

const priorities = {
  low: ['#B7EAC7', 'Низький'],
  medium: ['#FFE29A', 'Середній'],
  high: ['#FFB199', 'Високий'],
  urgent: ['#FF8A80', 'Терміновий'],
}
const priorityCycle = ['medium', 'high', 'urgent', 'low']

function calcStatus(todosCount, doneCount) {
  if (todosCount === 0) return 'draft'
  if (doneCount === 0) return 'planning'
  if (doneCount < todosCount) return 'in_progress'
  return 'completed'
}

const fmtDate = (iso, opts) => {
  if (!iso) return ''
  const d = new Date(typeof iso === 'string' && iso.length === 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('uk-UA', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

const isOverdueDate = (iso) => {
  if (!iso) return false
  return new Date(iso) < new Date(new Date().toDateString())
}

const empty = { title: '', description: '', due_date: '' }
const cleanTitle = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

const titleTextStyle = {
  fontSize: 'clamp(24px, 4vw, 36px)',
  fontWeight: 500,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#ffffff',
}

const descTextStyle = {
  fontSize: '15px',
  lineHeight: 1.45,
  color: 'rgba(255, 255, 255, 0.85)',
}

function ProjectDetails({
  project,
  worldId,
  locations,
  accent,
  canEdit,
  onEdit,
  onDelete,
}) {
  const qc = useQueryClient()
  const [newTodo, setNewTodo] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newDue, setNewDue] = useState('')
  const [todoSearch, setTodoSearch] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  // Перетягування як в оверлеї редагування: { id, over } + FLIP-анімація.
  const [drag, setDrag] = useState(null)
  const flipSnapshotRef = useRef(null)
  const undo = useUndo()
  // Повноекранний режим модалки — туду в дві колонки.
  const { full: isFullScreen } = useExpandableCard()

  const todosKey = ['todos', String(worldId)]
  const projectsKey = ['projects', String(worldId)]
  const worldKey = ['world', String(worldId)]
  const invalidateAll = () => {
    qc.invalidateQueries(todosKey)
    qc.invalidateQueries(projectsKey)
    qc.invalidateQueries(worldKey)
  }

  const { data: allTodos = [] } = useQuery({
    queryKey: todosKey,
    queryFn: () => api.get(`/worlds/${worldId}/todos/`).then((r) => r.data),
  })
  const todos = allTodos.filter((t) => String(t.project) === String(project.id))
  const sortedTodos = [...todos].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || b.id - a.id,
  )
  const q = todoSearch.trim().toLowerCase()
  const visibleTodos = q
    ? sortedTodos.filter((t) => (t.title || '').toLowerCase().includes(q))
    : sortedTodos
  const dndEnabled = canEdit && !q

  const addTodo = useMutation({
    mutationFn: ({ title, priority, due_date }) =>
      api.post(`/worlds/${worldId}/todos/`, {
        project: project.id,
        title,
        priority,
        due_date,
      }),
    onSuccess: () => {
      // Поле чистимо лише після успіху — при помилці текст лишається.
      setNewTodo('')
      invalidateAll()
    },
  })

  // Оптимістичний тогл: чекбокс і прогрес оновлюються миттєво.
  const toggleTodo = useMutation({
    mutationFn: ({ id, is_done }) =>
      api.patch(`/worlds/${worldId}/todos/${id}/`, { is_done: !is_done }),
    onMutate: async ({ id, is_done }) => {
      const next = !is_done
      await qc.cancelQueries({ queryKey: todosKey })
      await qc.cancelQueries({ queryKey: projectsKey })
      const prevTodos = qc.getQueryData(todosKey)
      const prevProjects = qc.getQueryData(projectsKey)
      qc.setQueryData(todosKey, (old) =>
        (old ?? []).map((x) => (x.id === id ? { ...x, is_done: next } : x)),
      )
      qc.setQueryData(projectsKey, (old) =>
        (old ?? []).map((p) => {
          if (p.id !== project.id) return p
          const total = p.todos_count ?? 0
          const done = Math.max(0, (p.todos_done ?? 0) + (next ? 1 : -1))
          return { ...p, todos_done: done, progress: total ? Math.round((done / total) * 100) : 0 }
        }),
      )
      return { prevTodos, prevProjects }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevTodos) qc.setQueryData(todosKey, ctx.prevTodos)
      if (ctx?.prevProjects) qc.setQueryData(projectsKey, ctx.prevProjects)
    },
    onSettled: invalidateAll,
  })

  const deleteTodo = (id) => {
    const t = todos.find((x) => x.id === id)
    undo.deleteItem({
      id,
      url: `/worlds/${worldId}/todos/${id}/`,
      queryKeys: [todosKey, projectsKey, worldKey],
      message: `Завдання «${t?.title || 'завдання'}» видалено`,
      nouns: ['завдання', 'завдання', 'завдань'],
    })
  }

  const handleAddTodo = () => {
    const title = newTodo.trim()
    if (!title || addTodo.isPending) return
    addTodo.mutate({ title, priority: newPriority, due_date: newDue || null })
  }

  const allDone = todos.length > 0 && todos.every((t) => t.is_done)
  const toggleAll = async () => {
    if (bulkBusy || todos.length === 0) return
    const target = !allDone
    setBulkBusy(true)
    try {
      await Promise.all(
        todos
          .filter((t) => t.is_done !== target)
          .map((t) =>
            api.patch(`/worlds/${worldId}/todos/${t.id}/`, { is_done: target }),
          ),
      )
    } finally {
      setBulkBusy(false)
      invalidateAll()
    }
  }

  const deleteDone = () => {
    todos.filter((t) => t.is_done).forEach((t) => deleteTodo(t.id))
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
    const prev = qc.getQueryData(todosKey)
    qc.setQueryData(todosKey, (old) =>
      (old ?? []).map((t) => {
        const i = ids.indexOf(t.id)
        return i === -1 ? t : { ...t, order: i }
      }),
    )
    try {
      await api.post(`/worlds/${worldId}/todos/reorder/`, {
        project: project.id,
        ids,
      })
    } catch {
      if (prev) qc.setQueryData(todosKey, prev)
    } finally {
      invalidateAll()
    }
  }

  // FLIP-анімація як в оверлеї: знімок позицій рядків ДО зміни порядку,
  // після рендеру рядки анімовано «перелітають» на нові місця.
  const snapshotTodoRects = () => {
    const snapshot = {}
    sortedTodos.forEach((t) => {
      const el = document.getElementById(`todo-slot-${t.id}`)
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
      const el = document.getElementById(`todo-slot-${key}`)
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

  // Скидання в кінець списку (на контейнер, а не на рядок).
  const onTodoDropEnd = (e) => {
    e.preventDefault()
    if (!drag || !dndEnabled) return
    const sourceId = drag.id
    setDrag(null)
    snapshotTodoRects()
    moveTodo(sourceId, null)
  }

  const doneCount = todos.filter((t) => t.is_done).length
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0
  const status = calcStatus(todos.length, doneCount)
  const projectOverdue = project.due_date && status !== 'completed' && isOverdueDate(project.due_date)
  const [prioDot, prioLabel] = priorities[newPriority] || priorities.medium

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>
          <LocationBadgeText text={project.title} worldId={worldId} locations={locations} />
          <span
            className={styles.statusBadge}
            style={{ background: statusColors[status] + '33', color: statusColors[status] }}
          >
            {statusLabels[status]}
          </span>
        </h3>
        {project.due_date && (
          <span
            className={`${styles.dueChip} ${projectOverdue ? styles.dueOverdue : ''}`}
            title={projectOverdue ? 'Прострочено' : `Дедлайн: ${fmtDate(project.due_date)}`}
          >
            {projectOverdue ? 'Прострочено · ' : 'Дедлайн: '}
            {fmtDate(project.due_date)}
          </span>
        )}
      </div>

      {project.description && (
        <p className={styles.detailsDesc}>
          <LocationBadgeText text={project.description} worldId={worldId} locations={locations} small />
        </p>
      )}

      {todos.length > 0 ? (
        <div className={styles.detailsProgress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>
            {doneCount} із {todos.length} завдань ({progress}%)
          </span>
        </div>
      ) : (
        <p className={styles.noTodos}>Завдань ще немає</p>
      )}

      <div className={styles.todosSection}>
        {canEdit && (
          <div className={styles.todoAdd}>
            <input
              type="text"
              className={styles.quickInput}
              placeholder="Нове завдання…"
              aria-label="Нове завдання"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            />
            <button
              type="button"
              className={styles.priorityCycle}
              title={`Пріоритет: ${prioLabel} (натисни, щоб змінити)`}
              aria-label={`Пріоритет нового завдання: ${prioLabel}`}
              onClick={() =>
                setNewPriority(
                  priorityCycle[
                    (priorityCycle.indexOf(newPriority) + 1) % priorityCycle.length
                  ],
                )
              }
            >
              <span className={styles.priorityDot} style={{ background: prioDot }} />
              {prioLabel}
            </button>
            <input
              type="date"
              className={styles.quickDue}
              aria-label="Дедлайн нового завдання"
              title="Дедлайн нового завдання"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
            />
            <IconButton
              className={styles.todoAddBtn}
              onClick={handleAddTodo}
              disabled={!newTodo.trim() || addTodo.isPending}
              aria-label="Додати завдання"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </div>
        )}

        {todos.length > 0 && (
          <div className={styles.todoTools}>
            {todos.length >= 4 && (
              <div className={styles.toolSearchWrap}>
                <SearchIcon className={sharedStyles.searchIcon} aria-hidden="true" />
                <input
                  type="search"
                  className={styles.toolSearch}
                  placeholder="Знайти завдання…"
                  aria-label="Пошук завдання в проєкті"
                  value={todoSearch}
                  onChange={(e) => setTodoSearch(e.target.value)}
                />
              </div>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={toggleAll}
                  disabled={bulkBusy}
                >
                  {allDone ? 'Зняти всі' : 'Позначити всі'}
                </button>
                {doneCount > 0 && (
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
              </>
            )}
          </div>
        )}

        <div
          className={`${styles.todoList} ${isFullScreen ? styles.todoListTwoCol : ''}`}
          onDragOver={dndEnabled ? (e) => e.preventDefault() : undefined}
          onDrop={dndEnabled ? onTodoDropEnd : undefined}
        >
          {visibleTodos.map((t) => {
            const [dot, label] = priorities[t.priority] || priorities.medium
            const showPriority = t.priority && t.priority !== 'medium'
            const overdue = !t.is_done && isOverdueDate(t.due_date)
            const toggle = () => toggleTodo.mutate({ id: t.id, is_done: t.is_done })
            return (
              <div
                key={t.id}
                id={`todo-slot-${t.id}`}
                className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''} ${
                  drag?.id === t.id ? styles.todoDragging : ''
                } ${drag?.over === t.id ? styles.todoDragOver : ''}`}
                draggable={dndEnabled}
                onDragStart={dndEnabled ? (e) => onTodoDragStart(e, t.id) : undefined}
                onDragOver={dndEnabled ? (e) => onTodoDragOver(e, t.id) : undefined}
                onDrop={dndEnabled ? (e) => onTodoDrop(e, t.id) : undefined}
                onDragEnd={() => setDrag(null)}
                onClick={canEdit ? toggle : undefined}
                style={canEdit ? { cursor: 'pointer' } : undefined}
                role={canEdit ? 'checkbox' : undefined}
                aria-checked={canEdit ? t.is_done : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onKeyDown={
                  canEdit
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggle()
                        }
                      }
                    : undefined
                }
              >
                {dndEnabled && (
                  <DragIndicatorIcon className={styles.dragHandle} aria-hidden="true" />
                )}
                <Checkbox
                  checked={t.is_done}
                  onClick={(e) => e.stopPropagation()}
                  onChange={canEdit ? toggle : undefined}
                  disabled={!canEdit}
                  size="small"
                  className={styles.todoCheckbox}
                />
                <div className={styles.todoMain}>
                  <span className={styles.todoTitle}>{t.title}</span>
                  {(showPriority || t.due_date) && (
                    <span className={styles.todoMeta}>
                      {showPriority && (
                        <span className={styles.miniChip}>
                          <span className={styles.miniDot} style={{ background: dot }} />
                          {label}
                        </span>
                      )}
                      {t.due_date && (
                        <span
                          className={`${styles.miniChip} ${overdue ? styles.dueOverdue : ''}`}
                          title={overdue ? `Прострочено: ${fmtDate(t.due_date)}` : fmtDate(t.due_date)}
                        >
                          {fmtDate(t.due_date, { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <IconButton
                    size="small"
                    className={styles.todoDelete}
                    aria-label="Видалити завдання"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTodo(t.id)
                    }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            )
          })}
          {todos.length > 0 && visibleTodos.length === 0 && (
            <p className={styles.noTodos}>Нічого не знайдено.</p>
          )}
        </div>
      </div>

      <div className={styles.detailsFooter}>
        <div className={styles.actionBtns}>
          <RelationshipButton
            worldId={worldId}
            sourceType="project"
            sourceId={project.id}
            name={project.title}
            accent={accent}
            className={styles.actionBtn}
          />
          {canEdit && (
            <>
              <IconButton className={styles.actionBtn} aria-label="Редагувати проєкт" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton className={styles.actionBtn} aria-label="Видалити проєкт" onClick={onDelete}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline-редактор проєкту в дусі нотаток: назва, опис і дедлайн
// пишуться прямо в модалці, без окремого діалогу.
function ProjectEditor({ worldId, accent, form, setForm, saving, isNew, onSave, onCancel }) {
  const canSave = cleanTitle(form.title).length > 0 && !saving
  const submit = (e) => {
    e.preventDefault()
    if (canSave) onSave()
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canSave) onSave()
    }
  }

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <form onSubmit={submit} onKeyDown={onKeyDown} className={styles.editorForm}>
        <div className={styles.detailsHead}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Назва проєкту"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            placeholder="Назва"
            editableStyle={titleTextStyle}
          />
        </div>
        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Опис проєкту"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            multiline
            minRows={3}
            placeholder="Опис…"
            editableStyle={descTextStyle}
          />
        </div>
        <div className={styles.dueRow}>
          <span className={styles.dueLabel}>Дедлайн</span>
          <input
            type="date"
            className={styles.dueInput}
            aria-label="Дедлайн проєкту"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
          {form.due_date && (
            <button
              type="button"
              className={styles.dueClear}
              aria-label="Прибрати дедлайн"
              title="Прибрати дедлайн"
              onClick={() => setForm((f) => ({ ...f, due_date: '' }))}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          )}
        </div>
        <div className={styles.editorFooter}>
          <span className={styles.editorHint}>Ctrl + Enter — зберегти</span>
          <span className={styles.editorActions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Скасувати
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!canSave}>
              {saving ? 'Збереження…' : isNew ? 'Створити' : 'Зберегти'}
            </button>
          </span>
        </div>
      </form>
    </div>
  )
}

// Відкриває власну модалку одразу після монтування —
// чернетка нового проєкту масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

// Згорнутий рядок проєкту. Редагування відкриває модалку
// цього ж проєкту одразу в режимі редагування.
function ProjectRow({ project: p, worldId, locations, accent, canEdit, onEdit, onDelete }) {
  const { open } = useExpandableCard()
  const pStatus = calcStatus(p.todos_count ?? 0, p.todos_done ?? 0)
  const overdueRow = p.due_date && pStatus !== 'completed' && isOverdueDate(p.due_date)
  const handleEdit = (e) => {
    e.stopPropagation()
    onEdit(p)
    open()
  }

  return (
    <div className={styles.projectItem}>
      <div className={styles.projectTitle}>
        <LocationBadgeText text={p.title} worldId={worldId} locations={locations} />
        <span
          className={styles.statusChip}
          style={{
            background: statusColors[pStatus] + '33',
            color: statusColors[pStatus],
          }}
        >
          {statusLabels[pStatus]}
        </span>
      </div>
      {p.description && (
        <div className={styles.projectDesc}>
          <LocationBadgeText text={p.description} worldId={worldId} locations={locations} small />
        </div>
      )}
      {(p.todos_count ?? 0) > 0 ? (
        <>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${p.progress ?? 0}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {p.todos_done ?? 0} із {p.todos_count ?? 0} завдань ({p.progress ?? 0}%)
          </div>
        </>
      ) : (
        <div className={styles.progressText}>Завдань ще немає</div>
      )}
      {overdueRow && (
        <div className={styles.overdueText}>Прострочено · {fmtDate(p.due_date)}</div>
      )}
      <div className={styles.rowActions}>
        <RelationshipButton
          worldId={worldId}
          sourceType="project"
          sourceId={p.id}
          name={p.title}
          accent={accent}
        />
        {canEdit && (
          <>
            <IconButton
              size="small"
              aria-label="Редагувати проєкт"
              onClick={handleEdit}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Видалити проєкт"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(p)
              }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </div>
    </div>
  )
}

function ProjectItemCard({
  project,
  worldId,
  locations,
  accent,
  canEdit,
  isEditing,
  form,
  setForm,
  saving,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onDiscardEdit,
}) {
  return (
    <ExpandableCard
      clickOpens
      showExpandBtn={false}
      onClose={onDiscardEdit}
      expandedContent={({ close }) =>
        isEditing ? (
          <ProjectEditor
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={saving}
            isNew={false}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <ProjectDetails
            project={project}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            onEdit={() => onEdit(project)}
            onDelete={() => {
              onDelete(project)
              close()
            }}
          />
        )
      }
    >
      <ProjectRow
        project={project}
        worldId={worldId}
        locations={locations}
        accent={accent}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ExpandableCard>
  )
}

function NewProjectCard({ worldId, accent, form, setForm, saving, onSave, onDiscard }) {
  const draftTitle = cleanTitle(form.title)

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <ProjectEditor
          worldId={worldId}
          accent={accent}
          form={form}
          setForm={setForm}
          saving={saving}
          isNew
          onSave={() => onSave(close)}
          onCancel={close}
        />
      )}
    >
      <AutoOpen />
      <div className={styles.projectItem}>
        <div className={`${styles.projectTitle} ${draftTitle ? '' : styles.draftTitle}`}>
          {draftTitle || 'Новий проєкт…'}
        </div>
      </div>
    </ExpandableCard>
  )
}

export default function ProjectsSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [statusFilter, setStatusFilter] = useState(null)
  const [search, setSearch] = useState('')
  const section = useExpandableCard()
  const canEdit = userRole && userRole !== 'viewer'

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/projects/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const visibleProjects = projects.filter((p) => {
    if (
      statusFilter &&
      calcStatus(p.todos_count ?? 0, p.todos_done ?? 0) !== statusFilter
    ) {
      return false
    }
    const q = search.trim().toLowerCase()
    if (section.full && q) {
      return `${p.title || ''} ${p.description || ''}`.toLowerCase().includes(q)
    }
    return true
  })

  const mutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? api.patch(`/worlds/${worldId}/projects/${id}/`, payload)
        : api.post(`/worlds/${worldId}/projects/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['projects', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const undo = useUndo()
  const deleteProject = (p) =>
    undo.deleteItem({
      id: p.id,
      url: `/worlds/${worldId}/projects/${p.id}/`,
      queryKeys: [
        ['projects', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Проєкт «${p.title}» видалено`,
      nouns: ['проєкт', 'проєкти', 'проєктів'],
    })

  const openNew = () => {
    setEditingId(null)
    setForm(empty)
    setCreating(true)
  }
  const openEdit = (p) => {
    setCreating(false)
    setEditingId(p.id)
    setForm({ title: p.title, description: p.description || '', due_date: p.due_date || '' })
  }
  // Скидання при закритті модалки будь-яким способом
  // (фон, Escape): незбережені зміни відкидаються.
  const discardEdit = () => setEditingId(null)
  const discardCreate = () => {
    setCreating(false)
    setForm(empty)
  }
  // Редагування лишає модалку відкритою — повертаємось до перегляду.
  const saveEdit = () => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: editingId, payload: { ...form, title, due_date: form.due_date || null } },
      { onSuccess: () => setEditingId(null) },
    )
  }
  // Створення закриває модалку — новий проєкт лишається у списку.
  const saveCreate = (close) => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: null, payload: { ...form, title, due_date: form.due_date || null } },
      { onSuccess: () => close() },
    )
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Проєкти ({projects.length})
        </h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Новий проєкт
          </Button>
        )}
      </div>

      {section.full && (
        <>
          <div className={sharedStyles.searchWrap}>
            <SearchIcon className={sharedStyles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={sharedStyles.wideSearch}
              placeholder="Знайти проєкт…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук проєкту"
            />
          </div>
          <div className={styles.statusChips} role="group" aria-label="Фільтр за статусом">
            {Object.entries(statusLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                className={`${styles.statusFilterChip} ${statusFilter === value ? styles.statusFilterChipActive : ''}`}
                // Значення-form замість тогл-апдейтера: тогл через
                // (cur => ...) губиться в цьому дереві (подвійне застосування
                // дає нетто-нуль), пряме значення — ні.
                onClick={() => setStatusFilter(statusFilter === value ? null : value)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        className={`${sharedStyles.body} ${styles.projectList} ${section.modal ? styles.projectListFull : ''} ${
          section.full ? styles.projectListWide : ''
        }`}
      >
        {canEdit && creating && (
          <NewProjectCard
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onSave={saveCreate}
            onDiscard={discardCreate}
          />
        )}
        {visibleProjects.map((p) => (
          <ProjectItemCard
            key={p.id}
            project={p}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            isEditing={editingId === p.id}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onEdit={openEdit}
            onSave={saveEdit}
            onCancelEdit={discardEdit}
            onDelete={deleteProject}
            onDiscardEdit={discardEdit}
          />
        ))}
        {visibleProjects.length === 0 && !creating && (
          <p className={sharedStyles.emptyMsg}>
            {projects.length === 0 ? 'Проєктів ще немає. Створіть перший.' : 'Нічого не знайдено.'}
          </p>
        )}
      </div>
    </div>
  )
}
