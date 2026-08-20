import { useState } from 'react'
import Grid from '@mui/material/Grid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  ImageList,
  ImageListItem,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import api from '../../api'

const categories = [
  ['base', 'База'],
  ['farm', 'Ферма'],
  ['mine', 'Шахта'],
  ['build', 'Споруда'],
  ['village', 'Село'],
  ['temple', 'Храм'],
  ['other', 'Інше'],
]

const empty = { name: '', description: '', x: 0, y: 0, z: 0, category: 'other' }

function CategoryChip({ category }) {
  const label = (categories.find(([v]) => v === category) || ['other', 'Інше'])[1]
  const color = category === 'base' ? '#4CAF7D' : '#7C83F5'
  const bg = category === 'base' ? 'rgba(183,234,199,.5)' : 'rgba(233,234,252,.9)'
  return <Chip size="small" label={label} sx={{ bgcolor: bg, color }} />
}

export default function LocationsSection({ worldId }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/locations/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/locations/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/locations/`, payload),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/locations/${id}/`),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  const uploadPhotos = useMutation({
    mutationFn: ({ locationId, files }) => {
      const entries = Array.from(files).map(
        (file) =>
          api.post(`/worlds/${worldId}/locations/${locationId}/screenshots/`, {
            image: file,
          }, { headers: { 'Content-Type': 'multipart/form-data' } })
      )
      return Promise.all(entries)
    },
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  const deleteScreenshot = useMutation({
    mutationFn: ({ location, shot }) =>
      api.delete(`/worlds/${worldId}/locations/${location.id}/screenshots/${shot.id}/`),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (l) => { setEditing(l); setForm({ ...l }); setOpen(true) }

  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync({ ...form, x: Number(form.x), y: Number(form.y), z: Number(form.z) }).then(() => setOpen(false))
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Локації ({locations.length})</Typography>
        <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Нова локація
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {locations.map((l) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={l.id}>
            <Card>
              <CardActionArea onClick={() => setGallery(l)}>
                {l.screenshots?.[0] ? (
                  <CardMedia component="img" height="150" image={l.screenshots[0].image} alt={l.name} />
                ) : (
                  <Box height={150} display="flex" alignItems="center" justifyContent="center" bgcolor="#F0F1FB" color="text.secondary">
                    <PhotoCameraOutlinedIcon sx={{ fontSize: 40 }} />
                  </Box>
                )}
              </CardActionArea>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{l.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      X: {l.x} · Y: {l.y} · Z: {l.z}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {l.description || 'Немає опису'}
                    </Typography>
                  </Box>
                  <CategoryChip category={l.category} />
                </Stack>
                <Stack direction="row" spacing={1} mt={1.5} alignItems="center">
                  <Chip size="small" label={`${l.screenshots?.length || 0} фото`} variant="outlined" onClick={() => setGallery(l)} />
                  <Box flex={1} />
                  <IconButton size="small" onClick={() => openEdit(l)}><EditOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove.mutate(l.id)}><DeleteOutlinedIcon fontSize="small" /></IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {locations.length === 0 && (
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary">
              Світ ще не досліджений. Додай першу локацію.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Location form */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати локацію' : 'Нова локація'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              <TextField label="Назва" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
              <TextField label="Опис" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline minRows={2} />
              <Grid container spacing={2}>
                {['x', 'y', 'z'].map((c) => (
                  <Grid size={4} key={c}>
                    <TextField
                      label={c.toUpperCase()}
                      type="number"
                      value={form[c]}
                      onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
                    />
                  </Grid>
                ))}
              </Grid>
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

      {/* Screenshot gallery */}
      <Dialog open={Boolean(gallery)} onClose={() => setGallery(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              {gallery?.name}
              <Typography variant="body2" color="text.secondary">
                X: {gallery?.x} · Y: {gallery?.y} · Z: {gallery?.z}
              </Typography>
            </Box>
            <TextField
              type="file"
              size="small"
              inputProps={{ multiple: true, accept: 'image/*' }}
              onChange={(e) => { setPhotos(Array.from(e.target.files || [])) }}
            />
            <Box>
              {photos.length > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() =>
                    uploadPhotos.mutateAsync({ locationId: gallery.id, files: photos }).then(() => setPhotos([]))
                  }
                >
                  Завантажити ({photos.length})
                </Button>
              )}
              <IconButton onClick={() => setGallery(null)} sx={{ ml: 1 }}><CloseIcon /></IconButton>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <ImageList cols={2} gap={12}>
            {(gallery?.screenshots || []).map((s, idx) => (
              <ImageListItem key={s.id} sx={{ borderRadius: 16, overflow: 'hidden' }}>
                <img src={s.image} alt={`Скріншот ${idx + 1}`} loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(13,13,15,.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(13,13,15,.7)' } }}
                  onClick={() => deleteScreenshot.mutate({ location: gallery, shot: s })}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </ImageListItem>
            ))}
          </ImageList>
        </DialogContent>
      </Dialog>
    </Box>
  )
}