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
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './NotesSection.module.css'

const empty = { title: '', content: '', tags: '' }

const parseTags = (tags) =>
  tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

function NoteDetails({ note, worldId, locations, accent, onClose, onEdit, onDelete }) {
  const tags = parseTags(note.tags)

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <IconButton className={styles.detailsClose} aria-label="Закрити" onClick={onClose}>
        <CloseIcon />
      </IconButton>

      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>
          <LocationBadgeText text={note.title} worldId={worldId} locations={locations} />
        </h3>
      </div>
      {tags.length > 0 && (
        <div className={styles.detailsTags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.detailsTag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.content && (
        <p className={styles.detailsContent}>
          <LocationBadgeText text={note.content} worldId={worldId} locations={locations} />
        </p>
      )}

      <div className={styles.detailsFooter}>
        <div className={styles.actionBtns}>
          <IconButton className={styles.actionBtn} aria-label="Редагувати нотатку" onClick={onEdit}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton className={styles.actionBtn} aria-label="Видалити нотатку" onClick={onDelete}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

export default function NotesSection({ worldId, accent }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [activeTag, setActiveTag] = useState(null)
  const section = useExpandableCard()

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/notes/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)

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
      queryKeys: [
        ['notes', String(worldId)],
        ['world', String(worldId)],
      ],
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

  const allTags = [...new Set(notes.flatMap((n) => parseTags(n.tags)))]
  const filteredNotes = activeTag
    ? notes.filter((n) => parseTags(n.tags).includes(activeTag))
    : notes

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Нотатки ({notes.length})</h3>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Нова нотатка
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className={styles.tagFilter}>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`${styles.tagFilterBtn} ${activeTag === tag ? styles.tagFilterActive : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div
        className={`${sharedStyles.body} ${styles.noteList} ${section.modal ? styles.noteListFull : ''}`}
      >
        {filteredNotes.map((n) => (
          <ExpandableCard
            key={n.id}
            clickOpens
            showExpandBtn={false}
            expandedContent={({ close }) => (
              <NoteDetails
                note={n}
                worldId={worldId}
                locations={locations}
                accent={accent}
                onClose={close}
                onEdit={() => openEdit(n)}
                onDelete={() => {
                  deleteNote(n)
                  close()
                }}
              />
            )}
          >
            <div className={styles.noteItem}>
              <div className={styles.noteContent}>
                <div className={styles.noteTitle}>
                  <LocationBadgeText text={n.title} worldId={worldId} locations={locations} />
                </div>
                {n.content && (
                  <div className={styles.noteDesc}>
                    <LocationBadgeText text={n.content} worldId={worldId} locations={locations} />
                  </div>
                )}
                {n.tags && (
                  <div className={styles.noteTags}>
                    {parseTags(n.tags).map((tag) => (
                      <span key={tag} className={styles.noteTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.rowActions}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(n)
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNote(n)
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
          </ExpandableCard>
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
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати нотатку' : 'Нова нотатка'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <LocationRichTextEditor
                worldId={worldId}
                label="Назва"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
              <LocationRichTextEditor
                worldId={worldId}
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
