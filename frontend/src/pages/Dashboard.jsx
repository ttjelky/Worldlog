import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import MapIcon from '@mui/icons-material/Map'
import api from '../api'

const emptyWorld = {
  name: '',
  description: '',
  seed: '',
  start_date: '',
  cover_image: null,
}

function useWorldForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setFile = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.files?.[0] || null }))
  return { form, set, setFile, setForm }
}

function WorldForm({ open, onClose, initial, onSubmit }) {
  const { form, set, setFile } = useWorldForm(initial)

  const submit = (e) => {
    e.preventDefault()
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== '') data.append(k, v)
    })
    onSubmit(data)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{initial.name ? 'Редагувати світ' : 'Новий світ'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField label="Назва світу" value={form.name} onChange={set('name')} required />
            <TextField label="Опис" value={form.description} onChange={set('description')} multiline minRows={3} />
            <TextField label="Сід (seed)" value={form.seed} onChange={set('seed')} />
            <TextField label="Дата початку" type="date" value={form.start_date} onChange={set('start_date')} InputLabelProps={{ shrink: true }} />
            <TextField label="Обкладинка" type="file" onChange={setFile('cover_image')} InputLabelProps={{ shrink: true }} helperText="Зображення для картки світу" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} color="inherit">Скасувати</Button>
          <Button type="submit" variant="contained" color="primary">Зберегти</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: worlds = [], isLoading } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })

  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const updateWorld = useMutation({
    mutationFn: ({ id, data }) =>
      api.patch(`/worlds/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const deleteWorld = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${id}/`),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (w) => {
    setEditing(w)
    setOpen(true)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4">Мої світи</Typography>
          <Typography variant="body2" color="text.secondary">
            {worlds.length} світ(ів) у твоєму літописі
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
          Новий світ
        </Button>
      </Stack>

      {isLoading && <LinearProgress />}

      <Grid container spacing={3}>
        {worlds.map((w) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={w.id}>
            <Card>
              <CardActionArea onClick={() => (location.href = `/app/worlds/${w.id}`)}>
                {w.cover_image_url ? (
                  <CardMedia component="img" height="160" image={w.cover_image_url} alt={w.name} />
                ) : (
                  <Box
                    sx={{
                      height: 160,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#E9EAFC',
                      color: 'primary.main',
                    }}
                  >
                    <MapIcon sx={{ fontSize: 56 }} />
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6">{w.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {w.description || 'Немає опису'}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`👤 ${w.players_count}`} />
                    <Chip size="small" label={`📌 ${w.locations_count}`} />
                    <Chip size="small" label={`☑️ ${w.todos_done}/${w.todos_count}`} />
                    <Chip size="small" label={`🕑 ${w.history_count}`} />
                  </Stack>
                </CardContent>
              </CardActionArea>
              <Box px={2} pb={2} display="flex" justifyContent="flex-end">
                <IconButton size="small" onClick={() => openEdit(w)} title="Редагувати">
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => { if (confirm('Видалити світ безповоротно?')) deleteWorld.mutate(w.id) }} title="Видалити">
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
        {worlds.length === 0 && !isLoading && (
          <Grid size={12}>
            <Box textAlign="center" py={10} color="text.secondary">
              <Typography variant="h5" mb={1}>Ще немає жодного світу</Typography>
              <Typography variant="body2" mb={3}>Створи перший паспорт свого світу</Typography>
              <Button variant="contained" color="primary" onClick={openCreate}>Новий світ</Button>
            </Box>
          </Grid>
        )}
      </Grid>

      <WorldForm
        open={open}
        onClose={() => setOpen(false)}
        initial={editing ? { ...emptyWorld, ...editing, cover_image: null } : emptyWorld}
        onSubmit={(data) => {
          if (editing) updateWorld.mutateAsync({ id: editing.id, data }).then(() => setOpen(false))
          else createWorld.mutateAsync(data).then(() => setOpen(false))
        }}
      />
    </Box>
  )
}