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
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
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

export default function TodosSection({ worldId, accent }) {
  const qc = useQueryClient()
  // modal=true — копія всередині розкритої модалки (там знімаємо ліміт
  // висоти списку), false — звичайна картка на дошці
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: allTodos = [] } = useQuery({
    queryKey: ['todos', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/todos/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const todos = allTodos.filter((t) => !t.project)
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/todos/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/todos/`, payload),
    onSuccess: () => qc.invalidateQueries(['todos', String(worldId)]),
  })
  const toggle = useMutation({
    mutationFn: (todo) =>
      api.patch(`/worlds/${worldId}/todos/${todo.id}/`, { is_done: !todo.is_done }),
    // Оптимістично перемикаємо одразу, щоб анімація була миттєвою
    onMutate: async (todo) => {
      await qc.cancelQueries(['todos', String(worldId)])
      const prev = qc.getQueryData(['todos', String(worldId)])
      qc.setQueryData(['todos', String(worldId)], (old) =>
        old.map((x) => (x.id === todo.id ? { ...x, is_done: !todo.is_done } : x)),
      )
      return { prev }
    },
    onError: (_err, _todo, ctx) => qc.setQueryData(['todos', String(worldId)], ctx.prev),
    onSettled: () => qc.invalidateQueries(['todos', String(worldId)]),
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
    todos.filter((t) => t.is_done).forEach(deleteTodo)
  }

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ ...t })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (editing) delete payload.is_done
    mutation.mutateAsync(payload).then(() => setOpen(false))
  }
  const done = todos.filter((t) => t.is_done).length

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
            >
              Видалити виконані
            </button>
          )}
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
            Нове завдання
          </Button>
        </div>
      </div>

      <div
        className={`${sharedStyles.body} ${styles.todoList} ${
          section.modal ? styles.todoListFull : ''
        }`}
      >
        {todos.map((t) => {
          const [dot, label] = priorities[t.priority]
          return (
            <div
              key={t.id}
              className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''}`}
              onClick={() => toggle.mutate(t)}
            >
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
              </div>
            </div>
          )
        })}
        {todos.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Плани ще не складені. Додай перше завдання.</p>
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
