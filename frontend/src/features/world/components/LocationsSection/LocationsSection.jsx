import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import styles from './LocationsSection.module.css'

const categories = [
  ['farm', 'Ферма'],
  ['mine', 'Шахта'],
  ['town', 'Містечко'],
  ['base', 'База'],
  ['structure', 'Структура'],
  ['biome', 'Біом'],
  ['build', 'Споруда'],
  ['poi', 'Точка інтересу'],
  ['other', 'Інше'],
]
const categoryLabels = Object.fromEntries(categories)
const legacyCategoryLabels = {
  village: categoryLabels.town,
  temple: categoryLabels.build,
}
const empty = { name: '', description: '', x: 0, y: 0, z: 0, category: 'other' }

function LocationDetails({
  location,
  accent,
  uploading,
  onClose,
  onEdit,
  onDelete,
  onUpload,
  onDeleteShot,
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const shots = location.screenshots || []
  const activeShot = shots[0] || null
  const category =
    legacyCategoryLabels[location.category] ||
    categoryLabels[location.category] ||
    categoryLabels.other

  const handleUpload = async (file) => {
    if (!file || isUploading) return
    setIsUploading(true)
    try {
      await onUpload(file)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <IconButton className={styles.detailsClose} aria-label="Закрити" onClick={onClose}>
        <CloseIcon />
      </IconButton>

      <div className={styles.detailsHead}>
        <h3 className={styles.detailsName}>{location.name}</h3>
        <div className={styles.detailsMeta}>
          <span className={styles.catPill}>{category}</span>
          <span className={styles.detailsCoords}>
            {location.x} {location.y} {location.z}
          </span>
        </div>
      </div>

      {activeShot ? (
        <img className={styles.detailsMainImg} src={activeShot.image} alt={location.name} />
      ) : (
        <div className={styles.detailsPlaceholder}>
          <PhotoCameraOutlinedIcon />
          <span>Ще немає фото</span>
        </div>
      )}

      {location.description && <p className={styles.detailsDesc}>{location.description}</p>}

      <div className={styles.detailsFooter}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
        {activeShot ? (
          <>
            <Button
              variant="contained"
              size="small"
              disabled={isUploading || uploading}
              startIcon={<AddPhotoAlternateOutlinedIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading || uploading ? 'Завантаження…' : 'Замінити фото'}
            </Button>
            <IconButton
              className={styles.actionBtn}
              aria-label="Видалити фото"
              disabled={isUploading || uploading}
              onClick={() => onDeleteShot(activeShot)}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Button
            variant="contained"
            size="small"
            disabled={isUploading || uploading}
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading || uploading ? 'Завантаження…' : 'Додати фото'}
          </Button>
        )}
        <div className={styles.locSpacer} />
        <IconButton className={styles.actionBtn} aria-label="Редагувати локацію" onClick={onEdit}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton className={styles.actionBtn} aria-label="Видалити локацію" onClick={onDelete}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  )
}

export default function LocationsSection({ worldId, accent }) {
  const qc = useQueryClient()
  // Прихована копія секції (modal=false) завжди показує лише 2 картки,
  // щоб не роздувати рядок сторінки; у розгорнутому вигляді — всі
  // (visibleLocations визначається нижче, після useQuery)
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const attachInputRef = useRef(null)

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/locations/`).then((r) => r.data),
  })
  const visibleLocations = section.modal ? locations : locations.slice(0, 2)
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

  // Відгукуємо object-URL прев'ю при зміні та при розмонтуванні
  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url)
    }
  }, [pendingPhoto])

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setPendingPhoto(null)
    setOpen(true)
  }
  const openEdit = (l) => {
    setEditing(l)
    setForm({ ...l })
    setPendingPhoto(null)
    setOpen(true)
  }
  const addPendingPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file, url: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }
  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await mutation.mutateAsync({
        ...form,
        x: Number(form.x),
        y: Number(form.y),
        z: Number(form.z),
      })
      const locationId = editing ? editing.id : res.data.id
      if (pendingPhoto) {
        await uploadPhotos.mutateAsync({ locationId, files: [pendingPhoto.file] })
      }
      setEditing(null)
      setPendingPhoto(null)
      setOpen(false)
    } catch {}
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

      <div className={`${sharedStyles.body} ${styles.locGrid} ${styles.gridFull} ${styles.gridCompact}`}>
        {visibleLocations.map((l) => (
          <ExpandableCard
            key={l.id}
            clickOpens
            showExpandBtn={false}
            expandedContent={({ close }) => (
              <LocationDetails
                location={l}
                accent={accent}
                uploading={uploadPhotos.isPending}
                onClose={close}
                onEdit={() => openEdit(l)}
                onDelete={() => {
                  remove.mutate(l.id)
                  close()
                }}
                onUpload={(file) => uploadPhotos.mutateAsync({ locationId: l.id, files: [file] })}
                onDeleteShot={(shot) => deleteScreenshot.mutate({ location: l, shot })}
              />
            )}
          >
            <article className={styles.locTile}>
              <div className={styles.locThumbArea}>
                {l.screenshots?.[0] ? (
                  <img className={styles.locThumb} src={l.screenshots[0].image} alt={l.name} />
                ) : (
                  <div className={styles.locThumbPlaceholder}>
                    <PhotoCameraOutlinedIcon />
                  </div>
                )}
              </div>
              <div className={styles.locBody}>
                <div className={styles.locTopRow}>
                  <div className={styles.locName}>{l.name}</div>
                  <span className={styles.catPill}>
                    {legacyCategoryLabels[l.category] || categoryLabels[l.category] || categoryLabels.other}
                  </span>
                </div>
                <div className={styles.coords}>
                  {l.x} {l.y} {l.z}
                </div>
                {l.description && <div className={styles.desc}>{l.description}</div>}
              </div>
              <footer className={styles.locFooter}>
                <IconButton
                  className={styles.actionBtn}
                  aria-label="Редагувати локацію"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(l)
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  className={styles.actionBtn}
                  aria-label="Видалити локацію"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove.mutate(l.id)
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </footer>
            </article>
          </ExpandableCard>
        ))}
        {locations.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Світ ще не досліджений. Додай першу локацію.</p>
        )}
        {!section.modal && locations.length > 2 && (
          <button
            type="button"
            className={styles.showAllBtn}
            onClick={section.open}
          >
            Показати всі локації ({locations.length})
          </button>
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
              <div className={styles.attachBlock}>
                <input
                  ref={attachInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={addPendingPhoto}
                />
                {pendingPhoto ? (
                  <Button
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    onClick={() => attachInputRef.current?.click()}
                  >
                    Замінити фото
                  </Button>
                ) : (
                  <Button
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    onClick={() => attachInputRef.current?.click()}
                  >
                    Додати фото
                  </Button>
                )}
                {pendingPhoto && (
                  <div className={styles.attachPreviews}>
                    <div className={styles.attachPreview}>
                      <img src={pendingPhoto.url} alt="" />
                      <IconButton
                        size="small"
                        className={styles.attachRemove}
                        aria-label="Прибрати фото"
                        onClick={() => setPendingPhoto(null)}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </div>
                  </div>
                )}
              </div>
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
