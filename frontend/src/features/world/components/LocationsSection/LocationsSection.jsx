import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
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
const categoryLabels = Object.fromEntries(categories)
const empty = { name: '', description: '', x: 0, y: 0, z: 0, category: 'other' }

export default function LocationsSection({ worldId, accent }) {
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
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Локації ({locations.length})</h3>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Нова локація
        </Button>
      </div>

      <div className={`${sharedStyles.body} ${styles.locGrid}`}>
        {locations.map((l) => (
          <div key={l.id} className={styles.locTile}>
            <button type="button" className={styles.locThumbBtn} onClick={() => setGallery(l)}>
              {l.screenshots?.[0] ? (
                <img className={styles.locThumb} src={l.screenshots[0].image} alt={l.name} />
              ) : (
                <div className={styles.locThumbPlaceholder}>
                  <PhotoCameraOutlinedIcon fontSize="small" />
                </div>
              )}
            </button>
            <div className={styles.locBody}>
              <div className={styles.locTopRow}>
                <div className={styles.locName}>{l.name}</div>
                <span className={styles.catPill}>{categoryLabels[l.category] || categoryLabels.other}</span>
              </div>
              <div className={styles.coords}>
                X: {l.x} · Y: {l.y} · Z: {l.z}
              </div>
              {l.description && <div className={styles.desc}>{l.description}</div>}
              <div className={styles.locActions}>
                <span className={styles.photoCountChip} onClick={() => setGallery(l)}>
                  {l.screenshots?.length || 0} фото
                </span>
                <div className={styles.locSpacer} />
                <div className={styles.rowActions}>
                  <IconButton size="small" onClick={() => openEdit(l)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove.mutate(l.id)}>
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Світ ще не досліджений. Додай першу локацію.</p>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } } }}
      >
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
              <div className={styles.coordRow}>
                {['x', 'y', 'z'].map((c) => (
                  <TextField
                    key={c}
                    label={c.toUpperCase()}
                    type="number"
                    value={form[c]}
                    onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
                    className={styles.coordField}
                  />
                ))}
              </div>
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
            <Button type="submit" variant="contained">
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
