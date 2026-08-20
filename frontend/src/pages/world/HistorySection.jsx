import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../api'

const categories = [
  ['achievement', 'Досягнення', '#7C83F5'],
  ['milestone', 'Віха', '#F2A65A'],
  ['important', 'Важливо', '#7C83F5'],
  ['completed', 'Завершено', '#4CAF7D'],
  ['expansion', 'Розширення', '#B7EAC7'],
  ['other', 'Інше', '#8A8AA0'],
]

const categoryMeta = Object.fromEntries(categories.map(([v, label, color]) => [v, { label, color }]))

const empty = { title: '', description: '', date: '', category: 'milestone' }

export default function HistorySection({ worldId }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: events = [] } = useQuery({
    queryKey: ['history', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/history/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/history/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/history/`, payload),
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/history/${id}/`),
    onSuccess: () => qc.invalidateQueries(['history', String(worldId)]),
  })

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (h) => { setEditing(h); setForm({ ...h }); setOpen(true) }

  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync(form).then(() => setOpen(false))
  }

  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Історія світу ({events.length})</Typography>
        <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Нова подія
        </Button>
      </Stack>

      <Box sx={{ position: 'relative', pl: { xs: 0, md: 3 } }}>
        {sorted.map((h, i) => {
          const { label, color } = categoryMeta[h.category] || categoryMeta.other
          const isLast = i === sorted.length - 1
          return (
            <Box key={h.id} sx={{ position: 'relative', pb: isLast ? 0 : 4, display: 'flex' }}>
              {/* rail */}
              {!isLast && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: { xs: 16, md: 16 },
                    top: 40,
                    bottom: 0,
                    width: 3,
                    borderRadius: 99,
                    bgcolor: 'rgba(124,131,245,.25)',
                  }}
                />
              )}
              {/* node */}
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: color,
                  boxShadow: `0 0 0 6px ${color}33`,
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {String(new Date(h.date).getDate()).padStart(2, '0')}
              </Box>
              {/* card */}
              <Box
                ml={2.5}
                flex={1}
                sx={{
                  borderRadius: 20,
                  p: 2.5,
                  bgcolor: '#F7F7FF',
                  border: '1px solid rgba(124,131,245,.12)',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="overline" sx={{ color, fontWeight: 900, letterSpacing: '.14em' }}>
                        {new Date(h.date).toLocaleDateString('uk-UA')}
                      </Typography>
                      <Chip size="small" label={label} sx={{ bgcolor: `${color}22`, color, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="h6">{h.title}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEdit(h)}><EditOutlinedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove.mutate(h.id)}><DeleteOutlinedIcon fontSize="small" /></IconButton>
                  </Box>
                </Stack>
                {h.description && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {h.description}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
        {events.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Літопис порожній. Зафіксуй першу подію світу.
          </Typography>
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати подію' : 'Нова подія'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField label="Заголовок" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus />
              <TextField label="Опис" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline minRows={2} />
              <TextField label="Дата" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required InputLabelProps={{ shrink: true }} />
              <TextField label="Категорія" select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {categories.map(([v, label]) => (
                  <MenuItem key={v} value={v}>{label}</MenuItem>
                ))}
              </TextField>
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