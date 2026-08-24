import { useState } from 'react'
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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import styles from './NotesSection.module.css'

const empty = { title: '', content: '', tags: '' }

export default function NotesSection({ worldId, accent }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/notes/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/notes/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/notes/`, payload),
    onSuccess: () => qc.invalidateQueries(['notes', String(worldId)]),
  })

  const undo = useUndo()
  const deleteNote = (n) =>
    undo.deleteItem({
      id: n.id,
      url: `/worlds/${worldId}/notes/${n.id}/`,
      queryKeys: [['notes', String(worldId)], ['world', String(worldId)]],
      message: `Нотатку «${n.title}» видалено`,
      nouns: ['нотатку', 'нотатки', 'нотаток'],
    })

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (n) => {
    setEditing(n)
    setForm({ title: n.title, content: n.content || '', tags: n.tags || '' })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync(form).then(() => setOpen(false))
  }

  const parseTags = (tags) =>
    tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Нотатки ({notes.length})
        </h3>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Нова нотатка
        </Button>
      </div>

      <div className={`${sharedStyles.body} ${styles.noteList}`}>
        {notes.map((n) => (
          <div key={n.id} className={styles.noteItem}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.noteTitle}>{n.title}</div>
              {n.content && <div className={styles.noteDesc}>{n.content}</div>}
              {n.tags && (
                <div className={styles.noteTags}>
                  {parseTags(n.tags).map((tag) => (
                    <span key={tag} className={styles.noteTag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.rowActions}>
              <IconButton
                size="small"
                onClick={() => openEdit(n)}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => deleteNote(n)}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Нотаток ще немає. Додай першу.</p>
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
          <DialogTitle>{editing ? 'Редагувати нотатку' : 'Нова нотатка'}</DialogTitle>
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
                label="Зміст"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                multiline
                minRows={3}
              />
              <TextField
                label="Теги (через кому)"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="наприклад: ідея, важливо, планування"
              />
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
