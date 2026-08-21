import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import styles from './TodosSection.module.css'

const priorities = {
  low: ['var(--color-priority-low-bg)', 'var(--color-priority-low-fg)', 'Низький'],
  medium: ['var(--color-priority-medium-bg)', 'var(--color-priority-medium-fg)', 'Середній'],
  high: ['var(--color-priority-high-bg)', 'var(--color-priority-high-fg)', 'Високий'],
  urgent: ['var(--color-priority-urgent-bg)', 'var(--color-priority-urgent-fg)', 'Терміновий'],
}
const empty = { title: '', description: '', priority: 'medium', due_date: '' }

export default function TodosSection({ worldId }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: todos = [] } = useQuery({
    queryKey: ['todos', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/todos/`).then((r) => r.data),
  })
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
    onSuccess: () => qc.invalidateQueries(['todos', String(worldId)]),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/todos/${id}/`),
    onSuccess: () => qc.invalidateQueries(['todos', String(worldId)]),
  })

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
    const payload = { ...form, due_date: form.due_date || null }
    if (editing) delete payload.is_done
    mutation.mutateAsync(payload).then(() => setOpen(false))
  }
  const done = todos.filter((t) => t.is_done).length

  return (
    <div>
      <div className={sharedStyles.sectionHeader}>
        <h6 className={sharedStyles.sectionTitle}>
          Todo-лист ({done}/{todos.length})
        </h6>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Нове завдання
        </Button>
      </div>
      <List disablePadding className={styles.todoList}>
        {todos.map((t) => {
          const [bg, color, label] = priorities[t.priority]
          return (
            <ListItem
              key={t.id}
              disableGutters
              className={`${styles.todoItem} ${t.is_done ? styles.todoItemDone : ''}`}
            >
              <ListItemIcon className={styles.todoCheckbox}>
                <Checkbox checked={t.is_done} onChange={() => toggle.mutate(t)} />
              </ListItemIcon>
              <ListItemText
                className={styles.todoText}
                primary={
                  <span className={`${styles.todoTitle} ${t.is_done ? styles.todoTitleDone : ''}`}>
                    {t.title}
                  </span>
                }
                secondary={t.description}
              />
              <div className={styles.todoMeta}>
                <Chip size="small" label={label} style={{ background: bg, color }} />
                {t.due_date && <Chip size="small" variant="outlined" label={t.due_date} />}
                <IconButton size="small" onClick={() => openEdit(t)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => remove.mutate(t.id)}>
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </div>
            </ListItem>
          )
        })}
        {todos.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Плани ще не складені. Додай перше завдання.</p>
        )}
      </List>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати завдання' : 'Нове завдання'}</DialogTitle>
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
              <TextField
                label="Пріоритет"
                select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {Object.entries(priorities).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v[2]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Дедлайн"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setOpen(false)} color="inherit">
              Скасувати
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Зберегти
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
