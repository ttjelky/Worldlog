import { useState } from 'react'
import Grid from '@mui/material/Grid2'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import styles from './LocationsSection.module.css'

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
  const color =
    category === 'base' ? 'var(--color-location-base-fg)' : 'var(--color-location-default-fg)'
  const bg =
    category === 'base' ? 'var(--color-location-base-bg)' : 'var(--color-location-default-bg)'
  return <Chip size="small" label={label} style={{ background: bg, color }} />
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
    mutationFn: ({ locationId, files }) =>
      Promise.all(
        Array.from(files).map((file) =>
          api.post(
            `/worlds/${worldId}/locations/${locationId}/screenshots/`,
            { image: file },
            { headers: { 'Content-Type': 'multipart/form-data' } },
          ),
        ),
      ),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })
  const deleteScreenshot = useMutation({
    mutationFn: ({ location, shot }) =>
      api.delete(`/worlds/${worldId}/locations/${location.id}/screenshots/${shot.id}/`),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (l) => {
    setEditing(l)
    setForm({ ...l })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    mutation
      .mutateAsync({ ...form, x: Number(form.x), y: Number(form.y), z: Number(form.z) })
      .then(() => setOpen(false))
  }

  return (
    <div>
      <div className={sharedStyles.sectionHeader}>
        <h6 className={sharedStyles.sectionTitle}>Локації ({locations.length})</h6>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Нова локація
        </Button>
      </div>
      <Grid container spacing={3}>
        {locations.map((l) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={l.id}>
            <Card>
              <CardActionArea onClick={() => setGallery(l)}>
                {l.screenshots?.[0] ? (
                  <CardMedia
                    component="img"
                    height="150"
                    image={l.screenshots[0].image}
                    alt={l.name}
                  />
                ) : (
                  <div className={styles.placeholder}>
                    <PhotoCameraOutlinedIcon className={styles.placeholderIcon} />
                  </div>
                )}
              </CardActionArea>
              <CardContent>
                <div className={styles.locMeta}>
                  <div className={styles.locInfo}>
                    <div className={styles.locName}>{l.name}</div>
                    <div className={styles.coords}>
                      X: {l.x} · Y: {l.y} · Z: {l.z}
                    </div>
                    <div className={styles.desc}>{l.description || 'Немає опису'}</div>
                  </div>
                  <CategoryChip category={l.category} />
                </div>
                <div className={styles.locActions}>
                  <Chip
                    size="small"
                    label={`${l.screenshots?.length || 0} фото`}
                    variant="outlined"
                    onClick={() => setGallery(l)}
                  />
                  <div className={styles.locSpacer} />
                  <IconButton size="small" onClick={() => openEdit(l)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove.mutate(l.id)}>
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {locations.length === 0 && (
          <Grid size={12}>
            <p className={sharedStyles.emptyMsg}>Світ ще не досліджений. Додай першу локацію.</p>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати локацію' : 'Нова локація'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <TextField
                label="Назва"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
              <TextField
                label="Категорія"
                select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {categories.map(([v, label]) => (
                  <MenuItem key={v} value={v}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
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

      <Dialog open={Boolean(gallery)} onClose={() => setGallery(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <div className={styles.galleryHeader}>
            <div className={styles.galleryInfo}>
              <div className={styles.galleryTitle}>{gallery?.name}</div>
              <div className={styles.galleryCoords}>
                X: {gallery?.x} · Y: {gallery?.y} · Z: {gallery?.z}
              </div>
            </div>
            <div className={styles.galleryActions}>
              <TextField
                type="file"
                size="small"
                inputProps={{ multiple: true, accept: 'image/*' }}
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
              {photos.length > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() =>
                    uploadPhotos
                      .mutateAsync({ locationId: gallery.id, files: photos })
                      .then(() => setPhotos([]))
                  }
                >
                  Завантажити ({photos.length})
                </Button>
              )}
              <IconButton onClick={() => setGallery(null)}>
                <CloseIcon />
              </IconButton>
            </div>
          </div>
        </DialogTitle>
        <DialogContent>
          <ImageList cols={2} gap={12}>
            {(gallery?.screenshots || []).map((s, idx) => (
              <ImageListItem key={s.id} className={styles.screenshotItem}>
                <img
                  className={styles.screenshotImg}
                  src={s.image}
                  alt={`Скріншот ${idx + 1}`}
                  loading="lazy"
                />
                <IconButton
                  className={styles.screenshotDelete}
                  size="small"
                  onClick={() => deleteScreenshot.mutate({ location: gallery, shot: s })}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </ImageListItem>
            ))}
          </ImageList>
        </DialogContent>
      </Dialog>
    </div>
  )
}
