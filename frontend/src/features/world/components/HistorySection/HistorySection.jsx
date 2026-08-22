import { useState } from 'react'
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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import styles from './HistorySection.module.css'

const categories = [
  ['achievement', 'Досягнення'],
  ['milestone', 'Віха'],
  ['important', 'Важливо'],
  ['completed', 'Завершено'],
  ['expansion', 'Розширення'],
  ['other', 'Інше'],
]
const categoryLabels = Object.fromEntries(categories)
const empty = { title: '', description: '', date: '', category: 'milestone' }

export default function HistorySection({ worldId, accent }) {
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

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (h) => {
    setEditing(h)
    setForm({ ...h })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync(form).then(() => setOpen(false))
  }
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Історія світу ({events.length})</h3>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Нова подія
        </Button>
      </div>

      <div className={`${sharedStyles.body} ${styles.timeline}`}>
        {sorted.map((h, i) => {
          const label = categoryLabels[h.category] || categoryLabels.other
          const isLast = i === sorted.length - 1
          return (
            <div key={h.id} className={`${styles.event} ${isLast ? styles.eventLast : ''}`}>
              {!isLast && <div className={styles.rail} />}
              <div className={styles.node}>
                {i + 1}
              </div>
              <div className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div className={styles.eventLeft}>
                    <div className={styles.eventMeta}>
                      <span className={styles.eventDate}>
                        {new Date(h.date).toLocaleDateString('uk-UA')}
                      </span>
                      <span className={styles.catPill}>{label}</span>
                    </div>
                    <div className={styles.eventTitle}>{h.title}</div>
                    {h.description && <p className={styles.eventDesc}>{h.description}</p>}
                  </div>
                  <div className={styles.rowActions}>
                    <IconButton size="small" onClick={() => openEdit(h)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove.mutate(h.id)}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {events.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Літопис порожній. Зафіксуй першу подію світу.</p>
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
          <DialogTitle>{editing ? 'Редагувати подію' : 'Нова подія'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <TextField
                label="Заголовок"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
              <TextField
                label="Дата"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                InputLabelProps={{ shrink: true }}
              />
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
