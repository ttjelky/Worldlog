import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import api from '../../../../api'
import { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './IdeasSection.module.css'

const empty = { title: '', content: '' }

export default function IdeasSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const canEdit = userRole && userRole !== 'viewer'

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/ideas/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/ideas/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/ideas/`, payload),
    onSuccess: () => qc.invalidateQueries(['ideas', String(worldId)]),
  })
  const undo = useUndo()
  const deleteIdea = (t) =>
    undo.deleteItem({
      id: t.id,
      url: `/worlds/${worldId}/ideas/${t.id}/`,
      queryKeys: [
        ['ideas', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Ідею «${t.title}» видалено`,
      nouns: ['ідея', 'ідеї', 'ідей'],
    })

  const convertMutation = useMutation({
    mutationFn: async (idea) => {
      await api.post(`/worlds/${worldId}/projects/`, {
        title: idea.title,
        description: idea.content,
        status: 'planning',
      })
      await api.delete(`/worlds/${worldId}/ideas/${idea.id}/`)
    },
    onSuccess: () => {
      qc.invalidateQueries(['ideas', String(worldId)])
      qc.invalidateQueries(['projects', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ title: t.title, content: t.content || '' })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync(form).then(() => setOpen(false))
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Ідеї ({ideas.length})
        </h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Нова ідея
          </Button>
        )}
      </div>

      <div
        className={`${sharedStyles.body} ${styles.ideaList} ${
          section.modal ? styles.ideaListFull : ''
        }`}
      >
        {ideas.map((t) => (
          <div key={t.id} className={styles.ideaItem}>
            <div className={styles.ideaContent}>
              <div className={styles.ideaTitle}>
                <LocationBadgeText text={t.title} worldId={worldId} locations={locations} />
              </div>
              {t.content && (
                <div className={styles.ideaDesc}>
                  <LocationBadgeText text={t.content} worldId={worldId} locations={locations} small />
                </div>
              )}
              <button className={styles.convertBtn} onClick={() => convertMutation.mutate(t)}>
                <AutoAwesomeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Перетворити на проєкт
              </button>
            </div>
            <div className={styles.rowActions}>
              {canEdit && (
                <>
                  <IconButton size="small" onClick={() => openEdit(t)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteIdea(t)}>
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        ))}
        {ideas.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Ідей поки немає. Додай першу ідею.</p>
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
          <DialogTitle>{editing ? 'Редагувати ідею' : 'Нова ідея'}</DialogTitle>
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
                label="Опис"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                multiline
                minRows={3}
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
