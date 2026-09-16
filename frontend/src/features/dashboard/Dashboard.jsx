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
  useMediaQuery,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'
import Navbar from '../../shared/components/Navbar/Navbar'
import { goSection } from '../../shared/utils/navigation'
import { useFeedback } from '../../shared/feedback/FeedbackProvider'
import WorldCard, { getCompletionPercent } from '../../shared/components/WorldCard/WorldCard'
import { summarizeWorlds } from './worldStats'
import { HomeWorldSection } from './components/HomeWorldSection'
import { HomeInvitesSection } from './components/HomeInvitesSection'
import { HomeFriendsSection } from './components/HomeFriendsSection'
import { HomeStats } from './components/HomeStats'
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

export function WorldForm({ open, onClose, initial, onSubmit, dark = false, tone }) {
  const { form, set, setBool, setFile } = useWorldForm(initial)
  // `tone` — явний варіант палітри: 'default' | 'dark' | 'myworlds'.
  // `dark` залишено для зворотної сумісності (alias для tone="dark").
  const effectiveTone = tone ?? (dark ? 'dark' : 'default')
  const paperClassName =
    effectiveTone === 'myworlds'
      ? `${styles.dialogPaper} ${styles.dialogPaperMyWorlds}`
      : effectiveTone === 'dark'
        ? `${styles.dialogPaper} ${styles.dialogPaperDark}`
        : styles.dialogPaper
  const backdropClassName =
    effectiveTone === 'myworlds'
      ? `${styles.dialogBackdrop} ${styles.dialogBackdropMyWorlds}`
      : effectiveTone === 'dark'
        ? `${styles.dialogBackdrop} ${styles.dialogBackdropDark}`
        : styles.dialogBackdrop
  // Мобільний: майже весь екран замість обрізаного вікна.
  const fullScreenXs = useMediaQuery('(max-width:480px)')
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
      fullScreen={fullScreenXs}
      scroll="paper"
      slotProps={{
        paper: {
          className: paperClassName,
        },
        backdrop: {
          className: backdropClassName,
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

function OverviewPanel({ worlds, isLoading, onOpenWorlds, onOpenWorld, onCreate }) {
  const { total, locations, pub, done, all, avg } = summarizeWorlds(worlds)
  const top = [...worlds]
    .sort((a, b) => getCompletionPercent(b) - getCompletionPercent(a))
    .slice(0, 4)
  // Світи, що найбільше відстають, — полити корали
  const attention = [...worlds]
    .filter((w) => getCompletionPercent(w) < 100)
    .sort((a, b) => getCompletionPercent(a) - getCompletionPercent(b))
    .slice(0, 2)
  // Останній торканий світ — швидке повернення в пригоду
  const recent = [...worlds].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  )[0]
  const recentDate =
    recent && !Number.isNaN(new Date(recent.updated_at).getTime())
      ? new Date(recent.updated_at).toLocaleDateString('uk-UA')
      : null

  const tiles = [
    ['Світи', total, styles.tileCoral],
    ['Локації', locations, styles.tilePeach],
    ['Задач виконано', `${done}/${all}`, styles.tileSeafoam],
    ['Середній прогрес', `${avg}%`, styles.tileSand],
    ['Публічні', pub, styles.tileShell],
  ]
  const leaderTones = ['coral', 'teal', 'sand', 'cactus']
  const attentionTones = ['coral', 'teal']

  return (
    <>
      {isLoading && <LinearProgress className={styles.overviewLoading} />}

      {!isLoading && total === 0 && (
        <div className={styles.emptyOcean}>
          <p className={styles.emptyOceanTitle}>Твій океан ще порожній</p>
          <p className={styles.emptyOceanSub}>
            Створи перший світ — і корали почнуть рости.
          </p>
          <Button className={styles.overviewCta} onClick={onCreate}>
            Створити світ
          </Button>
        </div>
      )}

      {!isLoading && total > 0 && (
        <>
          <div className={styles.overviewTiles}>
            {tiles.map(([label, value, tone]) => (
              <div key={label} className={`${styles.overviewTile} ${tone}`}>
                <span className={styles.overviewValue}>{value}</span>
                <span className={styles.overviewLabel}>{label}</span>
              </div>
            ))}
          </div>

          {recent && (
            <button
              type="button"
              className={styles.continueCard}
              onClick={() => onOpenWorld(recent.id)}
            >
              <span className={styles.continueLabel}>Продовжити пригоду</span>
              <span className={styles.continueName}>{recent.name}</span>
              <span className={styles.continueMeta}>
                {recentDate ? `Оновлено ${recentDate} · ` : ''}
                {recent.todos_done || 0}/{recent.todos_count || 0} задач
              </span>
              <span className={styles.continueBar}>
                <span
                  className={styles.continueFill}
                  style={{ width: `${getCompletionPercent(recent)}%` }}
                />
              </span>
              <span className={styles.continueOpen}>
                Відкрити світ
                <ArrowForwardIcon fontSize="small" />
              </span>
            </button>
          )}

          {attention.length > 0 && (
            <>
              <h2 className={styles.sectionSubtitle}>Потребують уваги</h2>
              <div className={styles.grid}>
                {attention.map((w, i) => (
                  <WorldCard key={w.id} world={w} index={i} tone={attentionTones[i % 2]} />
                ))}
              </div>
            </>
          )}

          {top.length > 0 && (
            <>
              <h2 className={styles.sectionSubtitle}>Лідери за прогресом</h2>
              <div className={styles.grid}>
                {top.map((w, i) => (
                  <WorldCard
                    key={w.id}
                    world={w}
                    index={i}
                    tone={leaderTones[i % leaderTones.length]}
                  />
                ))}
              </div>
            </>
          )}

          <Button className={styles.overviewCta} onClick={onOpenWorlds}>
            Перейти до моїх світів
            <ArrowForwardIcon fontSize="small" />
          </Button>
        </>
      )}
    </>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const { notify } = useFeedback()
  const [activePage, setActivePage] = useState(
    searchParams.get('tab') === 'overview' ? 'overview' : 'home',
  )

  const { data: worlds = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['worlds'],
    queryFn: () => api.get('/worlds/').then((r) => r.data),
  })
  const createWorld = useMutation({
    mutationFn: (data) =>
      api.post('/worlds/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries(['worlds'])
      notify('Світ створено')
    },
    onError: (err) => {
      notify(err.response?.data?.detail || 'Не вдалося створити світ')
    },
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

  return (
    <div className={`${styles.appShell} ${activePage === 'overview' ? styles.appShellOverview : ''}`}>
      <Navbar
        activePage={activePage}
        logoSrc={activePage === 'overview' ? '/worldlog-logo-ocean.png' : '/worldlog-logo-purple.png'}
        onNavigate={(id) => {
          if (id === 'home' || id === 'overview') switchTab(id)
          else goSection(id, navigate)
        }}
      />

      <div className={styles.page}>
        {activePage === 'overview' ? (
          <OverviewPanel
            worlds={worlds}
            isLoading={isLoading}
            onOpenWorlds={() => navigate('/app/worlds')}
            onOpenWorld={(id) => navigate(`/app/worlds/${id}`)}
            onCreate={openCreate}
          />
        ) : (
          <>
            <section className={styles.hero}>
              <p className={styles.heroGreeting}>WorldLog від DiJital</p>
              <h1 className={styles.heroTitle}>Головна сторінка</h1>
            </section>

            {isLoading && <LinearProgress />}

            {isError && (
              <div className={styles.errorBlock}>
                <p>Не вдалося завантажити світи.</p>
                <Button variant="outlined" size="small" onClick={() => refetch()}>
                  Спробувати ще
                </Button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                <HomeWorldSection
                  worlds={worlds}
                  onOpenWorlds={() => navigate('/app/worlds')}
                  onCreate={openCreate}
                />
                <HomeInvitesSection />
                <HomeFriendsSection />
                <HomeStats worlds={worlds} />
              </>
            )}
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
