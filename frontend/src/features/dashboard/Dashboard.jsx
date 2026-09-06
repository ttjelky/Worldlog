import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Switch,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import { goSection } from '../../shared/utils/navigation'
import WorldCard, { getCompletionPercent } from '../../shared/components/WorldCard/WorldCard'
import styles from './Dashboard.module.css'

export const emptyWorld = {
  name: '',
  description: '',
  seed: '',
  start_date: '',
  cover_image: null,
  is_public: false,
}

function useWorldForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (_e, checked) => setForm((f) => ({ ...f, [k]: checked }))
  const setFile = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.files?.[0] || null }))
  return { form, set, setBool, setFile, setForm }
}

export function WorldForm({ open, onClose, initial, onSubmit, dark = false }) {
  const { form, set, setBool, setFile } = useWorldForm(initial)
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
        paper: {
          className: dark ? `${styles.dialogPaper} ${styles.dialogPaperDark}` : styles.dialogPaper,
        },
        backdrop: {
          className: dark
            ? `${styles.dialogBackdrop} ${styles.dialogBackdropDark}`
            : styles.dialogBackdrop,
        },
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

            <FormControlLabel
              className={styles.toggleRow}
              control={
                <Switch
                  checked={form.is_public}
                  onChange={setBool('is_public')}
                  className={styles.toggleSwitch}
                />
              }
              label={
                <span className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>Публічний світ</span>
                  <span className={styles.toggleHint}>Публічні світи видно всім користувачам</span>
                </span>
              }
            />

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

function AddCardButton({ onClick }) {
  return (
    <Button
      className={`${styles.worldCard} ${styles.addCard}`}
      onClick={onClick}
      sx={{
        '& .MuiTouchRipple-ripple': {
          color: 'rgba(0, 0, 0, 0.18)',
        },
      }}
    >
      <AddIcon className={styles.addIcon} />
      <span className={styles.addText}>Новий світ</span>
    </Button>
  )
}

function OverviewPanel({ worlds, onOpenWorlds }) {
  const total = worlds.length
  const pub = worlds.filter((w) => w.is_public).length
  const done = worlds.reduce((s, w) => s + (w.todos_done || 0), 0)
  const all = worlds.reduce((s, w) => s + (w.todos_count || 0), 0)
  const avg = total
    ? Math.round(worlds.reduce((s, w) => s + getCompletionPercent(w), 0) / total)
    : 0
  const top = [...worlds]
    .sort((a, b) => getCompletionPercent(b) - getCompletionPercent(a))
    .slice(0, 4)

  const tiles = [
    ['Світи', total],
    ['Публічні', pub],
    ['Задач виконано', `${done}/${all}`],
    ['Середній прогрес', `${avg}%`],
  ]

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroGreeting}>Загальна картина</p>
        <h1 className={styles.heroTitle}>Огляд</h1>
      </section>

      <div className={styles.overviewTiles}>
        {tiles.map(([label, value]) => (
          <div key={label} className={styles.overviewTile}>
            <span className={styles.overviewValue}>{value}</span>
            <span className={styles.overviewLabel}>{label}</span>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <>
          <h2 className={styles.sectionSubtitle}>Лідери за прогресом</h2>
          <div className={styles.grid}>
            {top.map((w, i) => (
              <WorldCard key={w.id} world={w} index={i} tone="violet" />
            ))}
          </div>
        </>
      )}

      <Button className={styles.overviewCta} onClick={onOpenWorlds}>
        Перейти до моїх світів
        <ArrowForwardIcon fontSize="small" />
      </Button>
    </>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [activePage, setActivePage] = useState(
    searchParams.get('tab') === 'overview' ? 'overview' : 'home',
  )

  const { data: worlds = [], isLoading } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })
  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['worlds']),
  })

  const openCreate = () => {
    setOpen(true)
  }

  // Вкладка живе і в URL (?tab=overview), щоб «Огляд» відкривався
  // з будь-якої сторінки, а не лише з Головної
  const switchTab = (id) => {
    setActivePage(id)
    setSearchParams(id === 'overview' ? { tab: 'overview' } : {}, { replace: true })
  }

  useEffect(() => {
    setActivePage(searchParams.get('tab') === 'overview' ? 'overview' : 'home')
  }, [searchParams])

  const totalProgress = worlds.length
    ? Math.round(worlds.reduce((sum, w) => sum + getCompletionPercent(w), 0) / worlds.length)
    : 0

  return (
    <div className={styles.appShell}>
      <Navbar
        activePage={activePage}
        onNavigate={(id) => {
          if (id === 'home' || id === 'overview') switchTab(id)
          else goSection(id, navigate)
        }}
      />

      <div className={styles.page}>
        {activePage === 'overview' ? (
          <OverviewPanel worlds={worlds} onOpenWorlds={() => navigate('/app/worlds')} />
        ) : (
          <>
            <section className={styles.hero}>
              <p className={styles.heroGreeting}>WorldLog від DiJital</p>
              <h1 className={styles.heroTitle}>Головна сторінка</h1>
            </section>

            <div className={styles.statsBar}>
              <span className={styles.statsText}>
                {worlds.length}{' '}
                {worlds.length === 1 ? 'світ' : worlds.length < 5 ? 'світи' : 'світів'}
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
              {worlds.map((w, i) => (
                <WorldCard key={w.id} world={w} index={i} tone="violet" />
              ))}

              {worlds.length >= 1 ? (
                <Button
                  className={`${styles.worldCard} ${styles.addCard}`}
                  onClick={() => navigate('/app/worlds')}
                  sx={{
                    '& .MuiTouchRipple-ripple': {
                      color: 'rgba(0, 0, 0, 0.18)',
                    },
                  }}
                >
                  <ArrowForwardIcon className={styles.addIcon} />
                  <span className={styles.addText}>Перейти на сторінку "Мої світи"</span>
                </Button>
              ) : (
                <AddCardButton onClick={openCreate} />
              )}
            </div>
          </>
        )}
      </div>

      <WorldForm
        open={open}
        onClose={() => setOpen(false)}
        initial={emptyWorld}
        onSubmit={(data) => createWorld.mutateAsync(data).then(() => setOpen(false))}
      />
    </div>
  )
}
