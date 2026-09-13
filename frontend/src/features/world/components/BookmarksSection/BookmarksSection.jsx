import { useCallback, useEffect, useState } from 'react'
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import { useFeedback } from '../../../../shared/feedback/FeedbackProvider'
import styles from './BookmarksSection.module.css'

const empty = { title: '', url: '', description: '' }

function normalizeUrl(url) {
  const t = (url || '').trim()
  if (!t) return t
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(t)) return t
  return `https://${t}`
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const brokenNoun = (n) => {
  const d10 = n % 10
  const d100 = n % 100
  if (d10 === 1 && d100 !== 11) return 'посилання не працює'
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'посилання не працюють'
  return 'посилань не працюють'
}

// Favicon із сайту закладки: спочатку пробуємо /favicon.ico самого сайту,
// якщо немає — сервіс Google, в крайньому разі — стандартна іконка.
function Favicon({ domain }) {
  const [stage, setStage] = useState(0)
  if (!domain || stage > 1) {
    return <OpenInNewIcon fontSize="small" />
  }
  const src =
    stage === 0
      ? `https://${domain}/favicon.ico`
      : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setStage((s) => s + 1)}
    />
  )
}

export default function BookmarksSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const canEdit = userRole && userRole !== 'viewer'

  // Статуси перевірки — у спільному кеші React Query, а не в useState:
  // картка монтується двічі (згорнута + модалка), і useState губився
  // при максимізації/мінімізації. Кеш один на обидва маунти.
  const { data: checkResults = {} } = useQuery({
    queryKey: ['bookmark-checks', String(worldId)],
    queryFn: () => ({}),
    staleTime: Infinity,
  })
  const setCheckResults = useCallback(
    (updater) =>
      qc.setQueryData(['bookmark-checks', String(worldId)], (old) => {
        const prev = old ?? {}
        return typeof updater === 'function' ? updater(prev) : updater
      }),
    [qc, worldId],
  )

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/bookmarks/`).then((r) => r.data),
  })
  const visibleBookmarks = bookmarks
    .filter((b) => {
      if (section.full && search.trim()) {
        const q = search.trim().toLowerCase()
        return `${b.title || ''} ${b.url || ''}`.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      // Непрацюючі — нагору, далі закріплені
      const aBroken = checkResults[a.id] && !checkResults[a.id].ok
      const bBroken = checkResults[b.id] && !checkResults[b.id].ok
      if (!!aBroken !== !!bBroken) return aBroken ? -1 : 1
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1
      if (sort === 'domain') {
        const da = domainOf(a.url)
        const db = domainOf(b.url)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      }
      return (b.id || 0) - (a.id || 0)
    })
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/bookmarks/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/bookmarks/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['bookmarks', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })
  const undo = useUndo()
  const { notify } = useFeedback()
  const deleteBookmark = (b) =>
    undo.deleteItem({
      id: b.id,
      url: `/worlds/${worldId}/bookmarks/${b.id}/`,
      queryKeys: [
        ['bookmarks', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Закладку «${b.title}» видалено`,
      nouns: ['закладку', 'закладки', 'закладок'],
    })

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const openEdit = (b) => {
    setEditing(b)
    setForm({ title: b.title || '', url: b.url || '', description: b.description || '' })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    const wasEditing = editing
    const payload = {
      title: (form.title || '').trim(),
      url: normalizeUrl(form.url),
      description: form.description || '',
    }
    if (!payload.title || !payload.url) return
    mutation.mutateAsync(payload).then((res) => {
      setOpen(false)
      if (wasEditing) {
        // URL міг змінитись — старий статус недійсний, ефект нижче доперевірить
        setCheckResults((prev) => {
          const next = { ...prev }
          delete next[wasEditing.id]
          return next
        })
      } else if (res?.data?.id) {
        checkSingle(res.data)
      }
    })
  }

  const togglePin = (b) => {
    const next = !b.is_pinned
    // Optimistic: миттєво в кеші, ролбек при помилці.
    const key = ['bookmarks', String(worldId)]
    const prev = qc.getQueryData(key)
    qc.setQueryData(key, (old) => (old ?? []).map((x) => (x.id === b.id ? { ...x, is_pinned: next } : x)))
    api
      .patch(`/worlds/${worldId}/bookmarks/${b.id}/`, { is_pinned: next })
      .then(() => qc.invalidateQueries(key))
      .catch(() => {
        if (prev) qc.setQueryData(key, prev)
        notify('Не вдалося закріпити закладку')
      })
  }

  const broken = bookmarks.filter((b) => checkResults[b.id] && !checkResults[b.id].ok)

  // Автоперевірка щойно доданого посилання. Тост — тільки якщо бите.
  const checkSingle = async (bookmark) => {
    try {
      const { data } = await api.post(`/worlds/${worldId}/bookmarks/check/`, {
        ids: [bookmark.id],
      })
      const result = data?.[bookmark.id]
      if (!result) return
      setCheckResults((prev) => ({ ...prev, [bookmark.id]: result }))
      if (!result.ok) notify(`1 ${brokenNoun(1)}`)
    } catch {
      // Не змогли перевірити — мовчимо, тост тільки для битих
    }
  }

  // Мовчазна доперевірка відсутніх статусів при монтуванні: покриває
  // перезавантаження сторінки та закладки з іншого пристрою. Тостів тут
  // нема — тост тільки за дію користувача (додавання).
  useEffect(() => {
    const missing = bookmarks.filter((b) => !(b.id in checkResults)).map((b) => b.id)
    if (missing.length === 0) return
    let cancelled = false
    api
      .post(`/worlds/${worldId}/bookmarks/check/`, { ids: missing })
      .then(({ data }) => {
        if (cancelled) return
        const results = data || {}
        setCheckResults((prev) => ({ ...prev, ...results }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [bookmarks, checkResults, worldId, setCheckResults])

  const deleteBroken = () => {
    broken.forEach(deleteBookmark)
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Закладки ({bookmarks.length})
        </h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Нова закладка
          </Button>
        )}
      </div>

      {section.full && (
        <>
          <div className={sharedStyles.searchWrap}>
            <SearchIcon className={sharedStyles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={sharedStyles.wideSearch}
              placeholder="Знайти закладку…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук закладки"
            />
          </div>
          <div className={styles.toolbarRow}>
            <div className={styles.sortChips} role="group" aria-label="Сортування закладок">
              {[
                ['newest', 'Спочатку нові'],
                ['domain', 'За доменом'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sort === value}
                  className={`${styles.sortChip} ${sort === value ? styles.sortChipActive : ''}`}
                  onClick={() => setSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {canEdit && broken.length > 0 && (
              <div className={styles.checkGroup}>
                <button
                  type="button"
                  className={styles.deleteBrokenBtn}
                  onClick={deleteBroken}
                >
                  Видалити непрацюючі ({broken.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div
        className={`${sharedStyles.body} ${styles.bookmarkList} ${
          section.modal ? styles.bookmarkListFull : ''
        } ${section.full ? styles.bookmarkListWide : ''}`}
      >
        {visibleBookmarks.map((b) => {
          const domain = domainOf(b.url)
          const checked = checkResults[b.id]
          const isBroken = checked && !checked.ok
          const openLink = () => window.open(b.url, '_blank', 'noopener')
          const copyLink = async (e) => {
            e.stopPropagation()
            try {
              await navigator.clipboard.writeText(b.url)
              notify('Посилання скопійовано')
            } catch {
              notify('Не вдалося скопіювати')
            }
          }
          return (
            <div
              key={b.id}
              className={styles.bookmarkItem}
              onClick={openLink}
              role="link"
              tabIndex={0}
              title={b.url}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openLink()
                }
              }}
            >
              <div className={styles.bookmarkIcon}>
                <Favicon domain={domain} />
              </div>
              <div className={styles.bookmarkInfo}>
                <div className={styles.bookmarkTitleRow}>
                  <div
                    className={`${styles.bookmarkTitle} ${isBroken ? styles.bookmarkTitleBroken : ''}`}
                  >
                    {b.is_pinned && <span title="Закріплено">📌 </span>}
                    {b.title}
                  </div>
                  {isBroken && <span className={styles.brokenBadge}>Не працює</span>}
                </div>
                <div className={styles.bookmarkUrl}>{b.url}</div>
                {b.description && <div className={styles.bookmarkDesc}>{b.description}</div>}
              </div>
              <div className={styles.rowActions}>
                <RelationshipButton
                  worldId={worldId}
                  sourceType="bookmark"
                  sourceId={b.id}
                  name={b.title}
                  accent={accent}
                />
                <IconButton size="small" aria-label="Копіювати посилання" onClick={copyLink}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                {canEdit && (
                  <>
                    <IconButton
                      size="small"
                      aria-label={b.is_pinned ? 'Відкріпити' : 'Закріпити'}
                      title={b.is_pinned ? 'Відкріпити' : 'Закріпити'}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(b)
                      }}
                    >
                      {b.is_pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Редагувати закладку"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(b)
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Видалити закладку"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBookmark(b)
                      }}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {visibleBookmarks.length === 0 && (
          <p className={sharedStyles.emptyMsg}>
            {bookmarks.length === 0 ? 'Закладок поки немає. Додай першу.' : 'Нічого не знайдено.'}
          </p>
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
          <DialogTitle>{editing ? 'Редагувати закладку' : 'Нова закладка'}</DialogTitle>
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
                label="URL"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                required
                type="url"
                placeholder="https://example.com"
                helperText="Можна без https:// — додамо автоматично"
              />
              <TextField
                label="Опис"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                minRows={2}
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
