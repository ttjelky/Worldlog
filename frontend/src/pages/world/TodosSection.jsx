import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../api'

const priorities = {
  low: ['#E9EAFC', '#5C63E0', 'Низький'],
  medium: ['#FFF4D6', '#B07D1F', 'Середній'],
  high: ['#FFE7E7', '#C23636', 'Високий'],
  urgent: ['#FFDCDC', '#8C1D1D', 'Терміновий'],
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

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (t) => { setEditing(t); setForm({ ...t }); setOpen(true) }

  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form, due_date: form.due_date || null }
    if (editing) delete payload.is_done
    mutation.mutateAsync(payload).then(() => setOpen(false))
  }

  const done = todos.filter((t) => t.is_done).length

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Todo-лист ({done}/{todos.length})</Typography>
        <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Нове завдання
        </Button>
      </Stack>

      <List disablePadding>
        {todos.map((t) => {
          const [bg, color, label] = priorities[t.priority]
          return (
            <ListItem
              key={t.id}
              disableGutters
              sx={{
                borderRadius: 16,
                mb: 1,
                bgcolor: t.is_done ? 'rgba(183,234,199,.45)' : '#FFFFFF',
                border: '1px solid rgba(13,13,15,.08)',
                px: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Checkbox
                  checked={t.is_done}
                  onChange={() => toggle.mutate(t)}
                  sx={{ '&.Mui-checked': { color: '#4CAF7D' }, '& .MuiSvgIcon-root': { fontSize: 30 } }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.title}</Typography>
                }
                secondary={t.description}
              />
              <Chip size="small" label={label} sx={{ bgcolor: bg, color, mr: 1 }} />
              {t.due_date && <Chip size="small" variant="outlined" label={t.due_date} sx={{ mr: 1 }} />}
              <IconButton size="small" onClick={() => openEdit(t)}><EditOutlinedIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => remove.mutate(t.id)}><DeleteOutlinedIcon fontSize="small" /></IconButton>
            </ListItem>
          )
        })}
        {todos.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Плани ще не складені. Додай перше завдання.
          </Typography>
        )}
      </List>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати завдання' : 'Нове завдання'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField label="Назва" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus />
              <TextField label="Опис" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline minRows={2} />
              <TextField
                label="Пріоритет"
                select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {Object.entries(priorities).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v[2]}</MenuItem>
                ))}
              </TextField>
              <TextField label="Дедлайн" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)} color="inherit">Скасувати</Button>
            <Button type="submit" variant="contained" color="primary">Зберегти</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}