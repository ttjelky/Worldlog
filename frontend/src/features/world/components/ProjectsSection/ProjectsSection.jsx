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
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import styles from './ProjectsSection.module.css'

const statuses = {
  planning: 'Планування',
  active: 'Активний',
  completed: 'Завершено',
  on_hold: 'Призупинено',
}

const statusColors = {
  planning: '#B0B0B0',
  active: '#B7EAC7',
  completed: '#B7EAC7',
  on_hold: '#FFE29A',
}

const empty = { title: '', description: '', status: 'planning' }

export default function ProjectsSection({ worldId, accent }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/projects/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/projects/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/projects/`, payload),
    onSuccess: () => qc.invalidateQueries(['projects', String(worldId)]),
  })

  const undo = useUndo()
  const deleteProject = (p) =>
    undo.deleteItem({
      id: p.id,
      url: `/worlds/${worldId}/projects/${p.id}/`,
      queryKeys: [['projects', String(worldId)], ['world', String(worldId)]],
      message: `Проєкт «${p.title}» видалено`,
      nouns: ['проєкт', 'проєкти', 'проєктів'],
    })

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ ...p })
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
          Проєкти ({projects.length})
        </h3>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Новий проєкт
        </Button>
      </div>

      <div className={`${sharedStyles.body} ${styles.projectList}`}>
        {projects.map((p) => (
          <div key={p.id} className={styles.projectItem}>
            <div className={styles.projectHeader}>
              <div className={styles.projectTitle}>{p.title}</div>
              <div className={styles.rowActions}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(p)
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteProject(p)
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
            <span className={styles.statusChip} style={{ background: statusColors[p.status] + '33', color: statusColors[p.status] }}>
              {statuses[p.status]}
            </span>
            {p.description && <div className={styles.projectDesc}>{p.description}</div>}
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${p.progress ?? 0}%` }} />
            </div>
            <div className={styles.progressText}>
              {p.todos_done ?? 0} із {p.todos_count ?? 0} завдань ({p.progress ?? 0}%)
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className={sharedStyles.emptyMsg}>Проєктів ще немає. Створіть перший.</p>
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
          <DialogTitle>{editing ? 'Редагувати проєкт' : 'Новий проєкт'}</DialogTitle>
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
                label="Опис"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                minRows={2}
              />
              <TextField
                label="Статус"
                select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {Object.entries(statuses).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
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
