import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
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
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import styles from './InspirationSection.module.css'

export default function InspirationSection({ worldId, accent }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [caption, setCaption] = useState('')

  const { data: images = [] } = useQuery({
    queryKey: ['inspiration', String(worldId)],
    queryFn: () =>
      api.get(`/worlds/${worldId}/inspiration/`).then((r) => r.data),
  })

  const uploadMutation = useMutation({
    mutationFn: (formData) =>
      api.post(`/worlds/${worldId}/inspiration/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => qc.invalidateQueries(['inspiration', String(worldId)]),
  })

  const undo = useUndo()
  const deleteImage = (img) =>
    undo.deleteItem({
      id: img.id,
      url: `/worlds/${worldId}/inspiration/${img.id}/`,
      queryKeys: [
        ['inspiration', String(worldId)],
        ['world', String(worldId)],
      ],
      message: 'Зображення видалено',
      nouns: ['зображення', 'зображення', 'зображень'],
    })

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCaption('')
    setDialogOpen(true)
    e.target.value = ''
  }

  const handleUpload = () => {
    if (!pendingFile) return
    const fd = new FormData()
    fd.append('image', pendingFile)
    fd.append('caption', caption)
    uploadMutation.mutateAsync(fd).then(() => {
      URL.revokeObjectURL(previewUrl)
      setDialogOpen(false)
      setPendingFile(null)
      setPreviewUrl(null)
      setCaption('')
    })
  }

  const handleDialogClose = () => {
    URL.revokeObjectURL(previewUrl)
    setDialogOpen(false)
    setPendingFile(null)
    setPreviewUrl(null)
    setCaption('')
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Натхнення ({images.length})
        </h3>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => fileRef.current?.click()}
        >
          Додати
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileSelect}
      />

      <div className={`${sharedStyles.body} ${styles.grid}`}>
        {images.map((img) => (
          <div key={img.id} className={styles.tile}>
            <img src={img.image} alt={img.caption || ''} className={styles.tileImg} />
            {img.caption && <div className={styles.tileCaption}>{img.caption}</div>}
            <div className={styles.tileActions}>
              <button
                type="button"
                className={styles.tileActionBtn}
                onClick={() => deleteImage(img)}
              >
                <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        ))}
        <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
          <AddIcon />
        </div>
        {images.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Натхнення ще немає. Додай перше зображення.</p>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } } }}
      >
        <DialogTitle>Нове зображення</DialogTitle>
        <DialogContent>
          <div className={sharedStyles.formFields}>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Превʼю"
                style={{ width: '100%', borderRadius: 12, display: 'block' }}
              />
            )}
            <TextField
              label="Підпис"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              autoFocus
            />
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={handleDialogClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button
            onClick={handleUpload}
            className={sharedStyles.dialogBtnSubmit}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Завантаження...' : 'Завантажити'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
