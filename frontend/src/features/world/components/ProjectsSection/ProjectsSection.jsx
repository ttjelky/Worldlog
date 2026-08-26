import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import { useUndo } from '../../../../shared/undo/UndoProvider'
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
  in_progress: '#B7EAC7',
  completed: '#B7EAC7',
}

function calcStatus(todosCount, doneCount) {
  if (todosCount === 0) return 'draft'
  if (doneCount === 0) return 'planning'
  if (doneCount < todosCount) return 'in_progress'
  return 'completed'
}

const empty = { title: '', description: '' }

function ProjectDetails({ project, accent, onClose, onEdit, onDelete }) {
  const qc = useQueryClient()
  const [newTodo, setNewTodo] = useState('')

  const { data: allTodos = [] } = useQuery({
    queryKey: ['todos', String(project.world)],
    queryFn: () => api.get(`/worlds/${project.world}/todos/`).then((r) => r.data),
  })
  const todos = allTodos.filter((t) => String(t.project) === String(project.id))

  const addTodo = useMutation({
    mutationFn: (title) =>
      api.post(`/worlds/${project.world}/todos/`, { project: project.id, title }),
    onSuccess: () => {
      qc.invalidateQueries(['todos', String(project.world)])
      qc.invalidateQueries(['projects', String(project.world)])
    },
  })

  const toggleTodo = useMutation({
    mutationFn: ({ id, is_done }) =>
      api.patch(`/worlds/${project.world}/todos/${id}/`, { is_done: !is_done }),
    onSuccess: () => {
      qc.invalidateQueries(['todos', String(project.world)])
      qc.invalidateQueries(['projects', String(project.world)])
    },
  })

  const deleteTodo = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${project.world}/todos/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries(['todos', String(project.world)])
      qc.invalidateQueries(['projects', String(project.world)])
    },
  })

  const handleAddTodo = () => {
    const title = newTodo.trim()
    if (!title) return
    setNewTodo('')
    addTodo.mutate(title)
  }

  const doneCount = todos.filter((t) => t.is_done).length
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0
  const status = calcStatus(todos.length, doneCount)

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <IconButton className={styles.detailsClose} aria-label="Закрити" onClick={onClose}>
        <CloseIcon />
      </IconButton>

      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>
          {project.title}
          <span
            className={styles.statusChip}
            style={{ background: statusColors[status] + '33', color: statusColors[status] }}
          >
            {statusLabels[status]}
          </span>
        </h3>
      </div>

      {project.description && <p className={styles.detailsDesc}>{project.description}</p>}

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
        <div className={styles.todoAdd}>
          <TextField
            size="small"
            placeholder="Нове завдання…"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            className={styles.todoInput}
          />
          <IconButton
            className={styles.todoAddBtn}
            onClick={handleAddTodo}
            disabled={!newTodo.trim() || addTodo.isPending}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </div>

        <div className={styles.todoList}>
          {todos.map((t) => (
            <div
              key={t.id}
              className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''}`}
              onClick={() => toggleTodo.mutate({ id: t.id, is_done: t.is_done })}
              style={{ cursor: 'pointer' }}
            >
              <Checkbox
                checked={t.is_done}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleTodo.mutate({ id: t.id, is_done: t.is_done })}
                size="small"
                className={styles.todoCheckbox}
              />
              <span className={styles.todoTitle}>{t.title}</span>
              <IconButton
                size="small"
                className={styles.todoDelete}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTodo.mutate(t.id)
                }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detailsFooter}>
        <IconButton className={styles.actionBtn} aria-label="Редагувати проєкт" onClick={onEdit}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton className={styles.actionBtn} aria-label="Видалити проєкт" onClick={onDelete}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  )
}

export default function ProjectsSection({ worldId, accent }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const section = useExpandableCard()

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/projects/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/projects/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/projects/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['projects', String(worldId)])
      setOpen(false)
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
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ title: p.title, description: p.description || '' })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Проєкти ({projects.length})</h3>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Новий проєкт
        </Button>
      </div>

      <div
        className={`${sharedStyles.body} ${styles.projectList} ${section.modal ? styles.projectListFull : ''}`}
      >
        {projects.map((p) => {
          const pStatus = calcStatus(p.todos_count ?? 0, p.todos_done ?? 0)
          return (
            <ExpandableCard
              key={p.id}
              clickOpens
              showExpandBtn={false}
              expandedContent={({ close }) => (
                <ProjectDetails
                  project={p}
                  accent={accent}
                  onClose={close}
                  onEdit={() => openEdit(p)}
                  onDelete={() => {
                    deleteProject(p)
                    close()
                  }}
                />
              )}
            >
              <div className={styles.projectItem}>
                <div className={styles.projectTitle}>
                  {p.title}
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
                {p.description && <div className={styles.projectDesc}>{p.description}</div>}
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
                <div className={styles.rowActions}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(p)
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(p)
                    }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            </ExpandableCard>
          )
        })}
        {projects.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Проєктів ще немає. Створіть перший.</p>
        )}
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
          <DialogTitle>{editing ? 'Редагувати проєкт' : 'Новий проєкт'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <TextField
                label="Назва"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
              <TextField
                label="Опис"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                minRows={2}
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
