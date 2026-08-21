import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import styles from './Dashboard.module.css'

const emptyWorld = { name: '', description: '', seed: '', start_date: '', cover_image: null }

const PLACEHOLDER_COPY = {
  overview: 'Тут з\'явиться загальна статистика по всіх твоїх світах.',
  worlds: 'Тут з\'явиться повний перелік світів з фільтрами та сортуванням.',
  friends: 'Тут з\'являться світи та профілі твоїх друзів.',
  search: 'Тут з\'явиться пошук по світах, персонажах і подіях.',
}

function useWorldForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setFile = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.files?.[0] || null }))
  return { form, set, setFile, setForm }
}

function WorldForm({ open, onClose, initial, onSubmit }) {
  const { form, set, setFile } = useWorldForm(initial)
  const submit = (e) => {
    e.preventDefault()
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== '') data.append(k, v)
    })
    onSubmit(data)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { className: styles.dialogPaper },
        backdrop: { className: styles.dialogBackdrop },
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle className={styles.dialogTitle}>
          {initial.name ? 'Редагувати світ' : 'Новий світ'}
        </DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <p className={styles.dialogDescription}>
            {initial.name
              ? 'Оновіть інформацію про свій світ.'
              : 'Створіть новий світ та почніть досліджувати.'}
          </p>
          <div className={styles.formFields}>
            <div className={styles.formRow}>
              <TextField
                label="Назва світу"
                value={form.name}
                onChange={set('name')}
                required
                className={styles.fieldName}
              />
              <TextField
                label="Дата початку"
                type="date"
                value={form.start_date}
                onChange={set('start_date')}
                InputLabelProps={{ shrink: true }}
                className={styles.fieldDate}
              />
            </div>

            <TextField
              label="Опис"
              value={form.description}
              onChange={set('description')}
              multiline
              minRows={2}
              maxRows={3}
            />

            <TextField label="Сід (seed)" value={form.seed} onChange={set('seed')} />

            <div className={styles.orDivider} role="separator">
              <span className={styles.orDividerLine} />
              <span className={styles.orDividerLabel}>АБО</span>
              <span className={styles.orDividerLine} />
            </div>

            <label className={styles.fileDropzone} htmlFor="world-file-upload">
              <input
                id="world-file-upload"
                type="file"
                onChange={setFile('cover_image')}
                className={styles.fileInputHidden}
              />
              <span className={styles.fileDropzoneIcon}>
                <UploadFileOutlinedIcon fontSize="inherit" />
              </span>
              <span className={styles.fileDropzoneText}>
                <span className={styles.fileDropzoneTitle}>
                  {form.cover_image ? form.cover_image.name : 'Завантажити файл світу'}
                </span>
                <span className={styles.fileDropzoneHint}>
                  {form.cover_image
                    ? 'Натисніть, щоб обрати інший файл'
                    : 'Перетягніть файл сюди або натисніть для вибору'}
                </span>
              </span>
            </label>
          </div>
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button onClick={onClose} className={styles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={styles.dialogBtnSubmit}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function getWorldStatus(world) {
  const total = world.todos_count || 0
  const done = world.todos_done || 0
  if (total === 0) return { label: 'Новий', variant: 'default' }
  const ratio = done / total
  if (ratio >= 0.8) return { label: 'Активний', variant: 'success' }
  if (ratio >= 0.3) return { label: 'В роботі', variant: 'warning' }
  return { label: 'Початок', variant: 'default' }
}

function getCompletionPercent(world) {
  if (!world.todos_count) return 0
  return Math.round((world.todos_done / world.todos_count) * 100)
}

function PlaceholderPage({ id, label }) {
  return (
    <div className={styles.placeholder}>
      <h1 className={styles.placeholderTitle}>{label}</h1>
      <p className={styles.placeholderText}>{PLACEHOLDER_COPY[id]}</p>
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activePage, setActivePage] = useState('home')

  const { data: worlds = [], isLoading } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })
  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })
  const updateWorld = useMutation({
    mutationFn: ({ id, data }) =>
      api.patch(`/worlds/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })
  const deleteWorld = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${id}/`),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (w) => {
    setEditing(w)
    setOpen(true)
  }

  const totalProgress = worlds.length
    ? Math.round(worlds.reduce((sum, w) => sum + getCompletionPercent(w), 0) / worlds.length)
    : 0

  const NAV_ITEMS = [
    { id: 'home', label: 'Головна' },
    { id: 'overview', label: 'Огляд' },
    { id: 'worlds', label: 'Мої світи' },
    { id: 'friends', label: 'Друзі' },
    { id: 'search', label: 'Пошук' },
  ]

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activePage)

  return (
    <div className={styles.appShell}>
      <Navbar activePage={activePage} onNavigate={setActivePage} />

      <div className={styles.page}>
        {activePage !== 'home' ? (
          <PlaceholderPage id={activeNavItem.id} label={activeNavItem.label} />
        ) : (
          <>
            <section className={styles.hero}>
              <p className={styles.heroGreeting}>Керуйте світами</p>
              <h1 className={styles.heroTitle}>Головна сторінка</h1>
            </section>

            <div className={styles.statsBar}>
              <span className={styles.statsText}>
                {worlds.length} {worlds.length === 1 ? 'світ' : worlds.length < 5 ? 'світи' : 'світів'}
              </span>
              <div className={styles.statsRight}>
                <span className={styles.statsText}>{totalProgress}% задач виконано</span>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
                </div>
              </div>
            </div>

            {isLoading && <LinearProgress />}

            <div className={styles.grid}>
              {worlds.map((w, i) => {
                const status = getWorldStatus(w)
                const percent = getCompletionPercent(w)
                return (
                  <button
                    key={w.id}
                    className={styles.worldCard}
                    onClick={() => (location.href = `/app/worlds/${w.id}`)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardNumber}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={`${styles.cardBadge} ${styles[`badge${status.variant}`]}`}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className={styles.cardTitle}>{w.name}</h3>
                    <div className={styles.cardBottom}>
                      <div className={styles.cardOwner}>
                        <div className={styles.ownerAvatar}>
                          {(w.owner_username || '?')[0].toUpperCase()}
                        </div>
                        <span className={styles.ownerName}>{w.owner_username}</span>
                      </div>
                      <div className={styles.cardProgress}>
                        <div className={styles.cardProgressTrack}>
                          <div className={styles.cardProgressFill} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <IconButton
                        size="small"
                        className={styles.cardActionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(w)
                        }}
                        title="Редагувати"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        className={styles.cardActionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Видалити світ безповоротно?')) deleteWorld.mutate(w.id)
                        }}
                        title="Видалити"
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </button>
                )
              })}

              <button className={`${styles.worldCard} ${styles.addCard}`} onClick={openCreate}>
                <AddIcon className={styles.addIcon} />
                <span className={styles.addText}>Новий світ</span>
              </button>
            </div>
          </>
        )}
      </div>

      <WorldForm
        open={open}
        onClose={() => setOpen(false)}
        initial={editing ? { ...emptyWorld, ...editing, cover_image: null } : emptyWorld}
        onSubmit={(data) => {
          if (editing) updateWorld.mutateAsync({ id: editing.id, data }).then(() => setOpen(false))
          else createWorld.mutateAsync(data).then(() => setOpen(false))
        }}
      />
    </div>
  )
}