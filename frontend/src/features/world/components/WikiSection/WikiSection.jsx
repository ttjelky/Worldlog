import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  IconButton,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ClearIcon from '@mui/icons-material/Clear'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import PlaceIcon from '@mui/icons-material/Place'
import PersonIcon from '@mui/icons-material/Person'
import GroupsIcon from '@mui/icons-material/Groups'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PublicIcon from '@mui/icons-material/Public'
import ExtensionIcon from '@mui/icons-material/Extension'
import EventIcon from '@mui/icons-material/Event'
import SecurityIcon from '@mui/icons-material/Security'
import DescriptionIcon from '@mui/icons-material/Description'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import RelationshipList from '../shared/RelationshipList'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import { OPEN_WIKI_PAGE_EVENT } from '../RelationshipsSection/RelationshipsSection'
import styles from './WikiSection.module.css'

const PAGE_TYPES = [
  ['location', 'Локація', PlaceIcon],
  ['character', 'Персонаж', PersonIcon],
  ['faction', 'Фракція', GroupsIcon],
  ['kingdom', 'Королівство', AccountBalanceIcon],
  ['region', 'Регіон', PublicIcon],
  ['item', 'Предмет', ExtensionIcon],
  ['event', 'Подія', EventIcon],
  ['war', 'Війна', SecurityIcon],
  ['custom', 'Інше', DescriptionIcon],
]

const PAGE_TYPE_LABELS = Object.fromEntries(PAGE_TYPES.map(([v, l]) => [v, l]))
const PAGE_TYPE_ICONS = Object.fromEntries(PAGE_TYPES.map(([v, , I]) => [v, I]))

const EMOJI_BY_TYPE = {
  location: '🏰',
  character: '🧙',
  faction: '🛡️',
  kingdom: '👑',
  region: '🗺️',
  item: '⚔️',
  event: '⚡',
  war: '💥',
  custom: '📜',
}

const EMOJI_PRESETS = [
  '📜', '🏰', '🧙', '🛡️', '👑', '🗺️', '⚔️', '⚡', '💥',
  '🔮', '🐉', '⚓', '🌲', '🏮', '📖', '🗡️', '🪙', '🏹',
]
const EMOJI_FALLBACK = '📄'

const DANGER_OPTIONS = { low: 'Низький', medium: 'Середній', high: 'Високий', deadly: 'Смертельний' }

const INFOBOX_SCHEMAS = {
  character: [
    { key: 'race', label: 'Раса' },
    { key: 'status', label: 'Статус', options: { alive: 'Живий', dead: 'Загинув', missing: 'Зниклий' } },
    { key: 'faction', label: 'Фракція' },
    { key: 'role', label: 'Роль' },
    { key: 'home', label: 'Локація проживання' },
  ],
  location: [
    { key: 'region', label: 'Регіон' },
    { key: 'type', label: 'Тип', options: { city: 'Місто', village: 'Поселення', dungeon: 'Підземелля', biome: 'Біом', base: 'База', other: 'Інше' } },
    { key: 'danger', label: 'Рівень небезпеки', options: DANGER_OPTIONS },
    { key: 'population', label: 'Населення' },
    { key: 'status', label: 'Стан', options: { active: 'Активна', abandoned: 'Занедбана', under_construction: 'Будується' } },
  ],
  faction: [
    { key: 'leader', label: 'Лідер' },
    { key: 'allies', label: 'Союзники' },
    { key: 'enemies', label: 'Вороги' },
  ],
  kingdom: [
    { key: 'ruler', label: 'Правитель' },
    { key: 'capital', label: 'Столиця' },
  ],
  region: [
    { key: 'biome', label: 'Біом' },
    { key: 'danger', label: 'Рівень небезпеки', options: DANGER_OPTIONS },
    { key: 'points', label: 'Визначні місця' },
  ],
  item: [
    { key: 'type', label: 'Тип предмета' },
    { key: 'owner', label: 'Власник' },
    { key: 'rarity', label: 'Рідкість' },
  ],
  event: [
    { key: 'participants', label: 'Учасники' },
    { key: 'outcome', label: 'Результат' },
  ],
  war: [
    { key: 'parties', label: 'Сторони' },
    { key: 'status', label: 'Статус', options: { ongoing: 'Активна війна', finished: 'Завершена' } },
    { key: 'outcome', label: 'Результат' },
  ],
  custom: [],
}

const STATUS_OPTIONS = {
  alive: 'Живий',
  dead: 'Загинув',
  missing: 'Зниклий',
  active: 'Активна',
  abandoned: 'Занедбана',
  under_construction: 'Будується',
  ongoing: 'Активна війна',
  finished: 'Завершена',
}

const STATUS_COLORS = {
  alive: '#8FE3A0',
  dead: '#FF8A80',
  missing: '#FFE29A',
  active: '#8FE3A0',
  abandoned: '#B0B0B0',
  under_construction: '#FFB199',
  ongoing: '#FF8A80',
  finished: '#8FE3A0',
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Спочатку оновлені' },
  { value: 'alpha', label: 'За назвою' },
  { value: 'created', label: 'Спочатку нові' },
]

const SNIPPET_MAX = 300

// Обрізка сніпета: не ріжемо всередині [[посилання]] і посеред слова.
function snippetOf(text) {
  if (!text || text.length <= SNIPPET_MAX) return text
  let cut = text.slice(0, SNIPPET_MAX)
  const openIdx = cut.lastIndexOf('[[')
  const closeIdx = cut.lastIndexOf(']]')
  if (openIdx > closeIdx) cut = cut.slice(0, openIdx)
  cut = cut.replace(/\s+\S*$/, '')
  return `${cut.trimEnd()}…`
}

const WIKI_LINK_RE = /\[\[(?:wiki:)?([^\]|]+)\]\]/g

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('uk-UA')
}

function extractTitles(text) {
  if (!text) return []
  const out = []
  const re = new RegExp(WIKI_LINK_RE.source, 'g')
  let m
  while ((m = re.exec(text))) out.push(m[1].trim())
  return out
}

function renderContent(text, titleIndex, onOpen, onCreateMissing) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const parts = line.split(/(\[\[(?:wiki:)?[^\]]+\]\])/g)
    return (
      <span key={i}>
        {parts.map((part, j) => {
          const m = part.match(/^\[\[(?:wiki:)?(.+)\]\]$/)
          if (m) {
            const title = m[1].trim()
            const target = titleIndex.get(title.toLowerCase())
            const missing = !target && onCreateMissing
            return (
              <span
                key={j}
                className={target ? styles.pageDetailLink : styles.pageDetailLinkBroken}
                role={missing ? 'button' : undefined}
                tabIndex={missing ? 0 : undefined}
                title={missing ? `Створити сторінку «${title}»` : undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  if (target) onOpen?.(target)
                  else onCreateMissing?.(title)
                }}
                onKeyDown={
                  missing
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          onCreateMissing?.(title)
                        }
                      }
                    : undefined
                }
              >
                {title}
              </span>
            )
          }
          return part
        })}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })
}

const empty = {
  title: '',
  page_type: 'location',
  emoji: EMOJI_BY_TYPE.location,
  infobox: {},
  tags: '',
  world_date: '',
  content: '',
}

const cleanTitle = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

const titleTextStyle = {
  fontSize: 'clamp(24px, 4vw, 36px)',
  fontWeight: 500,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#ffffff',
}

const contentTextStyle = {
  fontSize: '15px',
  lineHeight: 1.55,
  color: 'rgba(255, 255, 255, 0.88)',
}

// Inline-редактор сторінки в дусі нотаток: усе пишеться прямо
// в модалці — назва, тип-пігулки, емодзі, поля інфобокса, зміст.
function WikiEditor({ worldId, accent, form, setForm, saving, isNew, duplicate, onSave, onCancel }) {
  const canSave = cleanTitle(form.title).length > 0 && !saving && !duplicate
  const submit = (e) => {
    e.preventDefault()
    if (canSave) onSave()
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canSave) onSave()
    }
  }
  const pickType = (nextType) => {
    setForm((f) => ({
      ...f,
      page_type: nextType,
      emoji:
        !f.emoji || f.emoji === EMOJI_BY_TYPE[f.page_type]
          ? EMOJI_BY_TYPE[nextType]
          : f.emoji,
    }))
  }
  const isCustomEmoji = !EMOJI_PRESETS.includes(form.emoji)

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <form onSubmit={submit} onKeyDown={onKeyDown} className={styles.editorForm}>
        <div className={styles.detailsHead}>
          <div className={styles.titleRow}>
            <select
              className={styles.emojiSelect}
              aria-label="Емодзі"
              title="Емодзі сторінки"
              value={isCustomEmoji ? '__custom' : form.emoji}
              onChange={(e) => {
                if (e.target.value === '__custom') setForm((f) => ({ ...f, emoji: '' }))
                else setForm((f) => ({ ...f, emoji: e.target.value }))
              }}
            >
              {EMOJI_PRESETS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
              <option value="__custom">✎ своє…</option>
            </select>
            {isCustomEmoji && (
              <input
                type="text"
                className={styles.emojiCustomInline}
                aria-label="Своє емодзі"
                title="Встав своє емодзі"
                placeholder="🙂"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              />
            )}
            <div className={styles.titleGrow}>
              <LocationRichTextEditor
                bare
                dark
                worldId={worldId}
                label="Назва сторінки"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
                placeholder="Назва"
                editableStyle={titleTextStyle}
              />
            </div>
          </div>
          {duplicate && (
            <p className={styles.dupWarningInline}>
              Сторінка з такою назвою вже існує — обери іншу.
            </p>
          )}
        </div>

        <div className={styles.typePickRow} role="group" aria-label="Тип сторінки">
          {PAGE_TYPES.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.page_type === value}
              className={`${styles.filterChip} ${
                form.page_type === value ? styles.filterChipActive : ''
              }`}
              onClick={() => pickType(value)}
              title={label}
            >
              <Icon sx={{ fontSize: 14 }} />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.infoGrid}>
          {(INFOBOX_SCHEMAS[form.page_type] || []).map((field) => (
            <label key={field.key} className={styles.infoField}>
              <span className={styles.infoLabel}>{field.label}</span>
              {field.options ? (
                <select
                  className={styles.infoInput}
                  value={form.infobox[field.key] || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      infobox: { ...f.infobox, [field.key]: e.target.value },
                    }))
                  }
                  aria-label={field.label}
                >
                  <option value="">— обери —</option>
                  {Object.entries(field.options).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className={styles.infoInput}
                  value={form.infobox[field.key] || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      infobox: { ...f.infobox, [field.key]: e.target.value },
                    }))
                  }
                  aria-label={field.label}
                />
              )}
            </label>
          ))}
        </div>

        <div className={styles.editorMetaRow}>
          <input
            type="text"
            className={styles.infoInput}
            aria-label="Теги"
            placeholder="Теги (через кому)"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
          <input
            type="text"
            className={styles.infoInput}
            aria-label="Дата в ігровому світі"
            placeholder="Дата в світі (Рік 3, Весна)"
            value={form.world_date}
            onChange={(e) => setForm((f) => ({ ...f, world_date: e.target.value }))}
          />
        </div>

        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Зміст сторінки"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            multiline
            minRows={8}
            placeholder="Зміст… Посилання на інші сторінки: [[Назва]]"
            editableStyle={contentTextStyle}
          />
        </div>

        <div className={styles.editorFooter}>
          <span className={styles.editorHint}>Ctrl + Enter — зберегти</span>
          <span className={styles.editorActions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Скасувати
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!canSave}>
              {saving ? 'Збереження…' : isNew ? 'Створити' : 'Зберегти'}
            </button>
          </span>
        </div>
      </form>
    </div>
  )
}

// Відкриває власну модалку одразу після монтування —
// чернетка нової сторінки масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

function NewPageCard({ worldId, accent, form, setForm, saving, duplicate, onSave, onDiscard }) {
  const draftTitle = cleanTitle(form.title)

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <WikiEditor
          worldId={worldId}
          accent={accent}
          form={form}
          setForm={setForm}
          saving={saving}
          isNew
          duplicate={duplicate}
          onSave={() => onSave(close)}
          onCancel={close}
        />
      )}
    >
      <AutoOpen />
      <div className={`${styles.pageCard} ${styles.pageCardDraft}`}>
        <div className={styles.pageCardThumb}>
          <span className={styles.pageCardEmoji}>
            {form.emoji || EMOJI_BY_TYPE[form.page_type] || EMOJI_FALLBACK}
          </span>
          <span className={styles.pageCardType}>
            {PAGE_TYPE_LABELS[form.page_type] || form.page_type}
          </span>
        </div>
        <div className={`${styles.pageCardTitle} ${draftTitle ? '' : styles.draftTitle}`}>
          {draftTitle || 'Нова сторінка…'}
        </div>
      </div>
    </ExpandableCard>
  )
}

export default function WikiSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()

  const [selectedPage, setSelectedPage] = useState(null)
  const [editingPage, setEditingPage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [activeTypes, setActiveTypes] = useState([])
  const [sort, setSort] = useState('updated')
  const canEdit = userRole && userRole !== 'viewer'
  const prevModal = useRef(section.modal)

  useEffect(() => {
    if (prevModal.current && !section.modal) setSelectedPage(null)
    prevModal.current = section.modal
  }, [section.modal])

  const { data: pages = [] } = useQuery({
    queryKey: ['wiki', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/wiki/`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? api.patch(`/worlds/${worldId}/wiki/${id}/`, payload)
        : api.post(`/worlds/${worldId}/wiki/`, payload),
    onSuccess: (res) => {
      const saved = res?.data
      if (saved) {
        setSelectedPage((cur) => (cur && cur.id === saved.id ? saved : cur))
      }
      qc.invalidateQueries(['wiki', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const undo = useUndo()
  const deletePage = (p) =>
    undo.deleteItem({
      id: p.id,
      url: `/worlds/${worldId}/wiki/${p.id}/`,
      queryKeys: [
        ['wiki', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Сторінку «${p.title}» видалено`,
      nouns: ['сторінку', 'сторінки', 'сторінок'],
    })

  const titleIndex = useMemo(
    () => new Map(pages.map((p) => [(p.title || '').toLowerCase(), p])),
    [pages],
  )

  const filteredPages = useMemo(() => {
    let result = pages
    if (activeTypes.length) result = result.filter((p) => activeTypes.includes(p.page_type))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) =>
        `${p.title} ${p.content || ''} ${p.tags || ''} ${JSON.stringify(p.infobox || {})}`
          .toLowerCase()
          .includes(q),
      )
    }
    return [...result].sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title, 'uk')
      if (sort === 'created') return new Date(b.created_at) - new Date(a.created_at)
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
  }, [pages, activeTypes, search, sort])

  const referencedBy = useMemo(() => {
    if (!selectedPage) return []
    const title = selectedPage.title.toLowerCase()
    return pages.filter(
      (p) =>
        p.id !== selectedPage.id &&
        extractTitles(p.content).some((t) => t.toLowerCase() === title),
    )
  }, [pages, selectedPage])

  const nestedChildren = useMemo(() => {
    if (!selectedPage) return []
    const title = selectedPage.title.toLowerCase()
    const out = []
    pages.forEach((p) => {
      if (p.id === selectedPage.id) return
      const inf = p.infobox || {}
      ;(INFOBOX_SCHEMAS[p.page_type] || []).forEach((field) => {
        const tokens = String(inf[field.key] || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
        if (tokens.some((t) => t === title)) out.push({ page: p, label: field.label })
      })
    })
    return out
  }, [pages, selectedPage])

  const visiblePages = section.modal ? filteredPages : filteredPages.slice(0, 4)

  const openNew = () => {
    setEditingPage(null)
    setForm(empty)
    setCreating(true)
  }

  // Створення з битого посилання [[Назва]]: назва вже підставлена.
  const openNewWithTitle = (title) => {
    setEditingPage(null)
    setForm({ ...empty, title })
    setCreating(true)
  }

  const openEdit = (page) => {
    setCreating(false)
    setEditingPage(page)
    setForm({
      title: page.title,
      page_type: page.page_type,
      emoji: page.emoji || EMOJI_BY_TYPE[page.page_type] || EMOJI_FALLBACK,
      infobox: page.infobox || {},
      tags: page.tags || '',
      world_date: page.world_date || '',
      content: page.content || '',
    })
  }

  // Скидання при закритті модалки будь-яким способом
  // (фон, Escape): незбережені зміни відкидаються.
  const discardEdit = () => setEditingPage(null)
  const discardCreate = () => {
    setCreating(false)
    setForm(empty)
  }

  const buildPayload = (f) => {
    const infobox = Object.fromEntries(
      Object.entries(f.infobox).filter(([, v]) => String(v || '').trim() !== ''),
    )
    return {
      title: cleanTitle(f.title),
      page_type: f.page_type,
      emoji: f.emoji || EMOJI_BY_TYPE[f.page_type] || EMOJI_FALLBACK,
      infobox,
      tags: f.tags,
      world_date: f.world_date,
      content: f.content,
    }
  }

  // Редагування лишає модалку відкритою — повертаємось до перегляду.
  const saveEdit = () => {
    if (!cleanTitle(form.title) || mutation.isPending || isDuplicateTitle) return
    mutation.mutate(
      { id: editingPage.id, payload: buildPayload(form) },
      { onSuccess: () => setEditingPage(null) },
    )
  }
  // Створення закриває модалку чернетки — сторінка лишається у списку.
  const saveCreate = (close) => {
    if (!cleanTitle(form.title) || mutation.isPending || isDuplicateTitle) return
    mutation.mutate({ id: null, payload: buildPayload(form) }, { onSuccess: () => close() })
  }

  // Бекенд тримає unique_together (world, title), а граф зіставляє
  // назви без регістру — попереджаємо про обидва випадки заздалегідь.
  const isDuplicateTitle =
    form.title.trim() !== '' &&
    pages.some(
      (p) =>
        p.title.trim().toLowerCase() === form.title.trim().toLowerCase() &&
        (!editingPage || p.id !== editingPage.id),
    )

  const submit = (e) => {
    e.preventDefault()
    if (mutation.isPending || isDuplicateTitle) return
    const infobox = Object.fromEntries(
      Object.entries(form.infobox).filter(([, v]) => String(v || '').trim() !== ''),
    )
    const payload = {
      title: form.title.trim(),
      page_type: form.page_type,
      emoji: form.emoji || EMOJI_BY_TYPE[form.page_type] || EMOJI_FALLBACK,
      infobox,
      tags: form.tags,
      world_date: form.world_date,
      content: form.content,
    }
    mutation.mutate(payload)
  }

  const openPage = (page) => {
    setSelectedPage(page)
    if (!section.modal) section.open()
  }
  const goBack = () => setSelectedPage(null)

  // Клік по вузлу графа в картці «Зв'язки» відкриває сторінку тут.
  useEffect(() => {
    const handler = (e) => {
      const page = pages.find((p) => p.id === e.detail)
      if (page) openPage(page)
    }
    window.addEventListener(OPEN_WIKI_PAGE_EVENT, handler)
    return () => window.removeEventListener(OPEN_WIKI_PAGE_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, section])

  const toggleType = (value) =>
    setActiveTypes(
      activeTypes.includes(value)
        ? activeTypes.filter((t) => t !== value)
        : [...activeTypes, value],
    )

  const hasActiveFilters = activeTypes.length > 0 || search.trim() !== ''
  const resetFilters = () => {
    setActiveTypes([])
    setSearch('')
  }

  const renderTitles = (text) =>
    String(text || '')
      .split(',')
      .filter(Boolean)
      .map((token, i) => {
        const t = token.trim()
        const target = titleIndex.get(t.toLowerCase())
        return (
          <span key={i}>
            {i > 0 && <span className={styles.tokenSep}>, </span>}
            {target ? (
              <span
                className={styles.pageDetailLink}
                onClick={(e) => {
                  e.stopPropagation()
                  openPage(target)
                }}
              >
                {t}
              </span>
            ) : (
              t
            )}
          </span>
        )
      })

  const pageEmoji = (p) => p.emoji || EMOJI_BY_TYPE[p.page_type] || EMOJI_FALLBACK

  const renderPageDetail = () => {
    const TypeIcon = PAGE_TYPE_ICONS[selectedPage.page_type] || DescriptionIcon
    const inf = selectedPage.infobox || {}
    const infoboxEntries = (INFOBOX_SCHEMAS[selectedPage.page_type] || [])
      .map((field) => ({ field, value: inf[field.key] }))
      .filter(({ value }) => String(value || '').trim() !== '')
    const statusValue = inf.status
    const statusColor = STATUS_COLORS[statusValue]
    const tags = (selectedPage.tags || '').split(',').map((t) => t.trim()).filter(Boolean)

    return (
      <div className={styles.pageDetail}>
        <button type="button" className={styles.backBtn} onClick={goBack}>
          <ArrowBackIcon sx={{ fontSize: 18 }} />
          Назад
        </button>
        <div className={styles.pageDetailHeader}>
          <div className={styles.pageDetailHeadline}>
            <span className={styles.pageDetailEmoji}>{pageEmoji(selectedPage)}</span>
            <div>
              <h3 className={styles.pageDetailTitle}>{selectedPage.title}</h3>
              <div className={styles.pageDetailMeta}>
                <span className={styles.pageDetailTypeChip}>
                  <TypeIcon sx={{ fontSize: 14 }} />
                  {PAGE_TYPE_LABELS[selectedPage.page_type] || selectedPage.page_type}
                </span>
                {statusColor && (
                  <span
                    className={styles.statusBadge}
                    style={{ backgroundColor: `${statusColor}30`, color: '#ffffff' }}
                  >
                    {STATUS_OPTIONS[statusValue]}
                  </span>
                )}
                {selectedPage.world_date && (
                  <span className={styles.pageDetailDate}>📅 {selectedPage.world_date}</span>
                )}
                {selectedPage.updated_at && formatDate(selectedPage.updated_at) && (
                  <span className={styles.pageDetailDates}>
                    Оновлено: {formatDate(selectedPage.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className={styles.pageDetailActions}>
              <IconButton aria-label="Редагувати" onClick={() => openEdit(selectedPage)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Видалити"
                onClick={() => {
                  deletePage(selectedPage)
                  setSelectedPage(null)
                }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          )}
        </div>

        {infoboxEntries.length > 0 && (
          <div className={styles.infobox}>
            {infoboxEntries.map(({ field, value }) => (
              <div key={field.key} className={styles.infoboxRow}>
                <span className={styles.infoboxLabel}>{field.label}</span>
                <span className={styles.infoboxValue}>{renderTitles(value)}</span>
              </div>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className={styles.tagRow}>
            {tags.map((t, i) => (
              <span key={i} className={styles.tag}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {selectedPage.content && (
          <div className={styles.pageDetailContent}>
            {renderContent(
              selectedPage.content,
              titleIndex,
              openPage,
              canEdit ? openNewWithTitle : undefined,
            )}
          </div>
        )}

        {nestedChildren.length > 0 && (
          <div className={styles.nestedBlock}>
            <h4 className={styles.nestedBlockTitle}>Вкладені сторінки</h4>
            <div className={styles.nestedLinks}>
              {nestedChildren.map(({ page, label }) => (
                <button
                  key={`${page.id}-${label}`}
                  type="button"
                  className={styles.nestedLink}
                  onClick={() => openPage(page)}
                >
                  {pageEmoji(page)} {page.title}
                  <span className={styles.nestedLinkLabel}>— {label.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {referencedBy.length > 0 && (
          <div className={styles.nestedBlock}>
            <h4 className={styles.nestedBlockTitle}>Згадується у ({referencedBy.length})</h4>
            <div className={styles.nestedLinks}>
              {referencedBy.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={styles.nestedLink}
                  onClick={() => openPage(page)}
                >
                  {pageEmoji(page)} {page.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <RelationshipList worldId={worldId} sourceType="wiki_page" sourceId={selectedPage.id} />
      </div>
    )
  }

return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Вікі ({pages.length})</h3>
        {canEdit && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
            Нова сторінка
          </Button>
        )}
      </div>

      <div
        className={`${sharedStyles.body} ${styles.wikiContent} ${
          section.modal ? styles.wikiContentFull : ''
        }`}
      >
        {section.modal && selectedPage ? (
          <>
            {canEdit && creating && (
              <span hidden aria-hidden="true">
                <NewPageCard
                  worldId={worldId}
                  accent={accent}
                  form={form}
                  setForm={setForm}
                  saving={mutation.isPending}
                  duplicate={isDuplicateTitle}
                  onSave={saveCreate}
                  onDiscard={discardCreate}
                />
              </span>
            )}
            {editingPage ? (
              <WikiEditor
                worldId={worldId}
                accent={accent}
                form={form}
                setForm={setForm}
                saving={mutation.isPending}
                isNew={false}
                duplicate={isDuplicateTitle}
                onSave={saveEdit}
                onCancel={discardEdit}
              />
            ) : (
              renderPageDetail()
            )}
          </>
        ) : (
          <>
            <div className={styles.toolbar}>
                  <div className={styles.toolbarRow}>
                    <TextField
                      className={styles.searchInput}
                      size="small"
                      placeholder="Пошук у вікі…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                          endAdornment: search ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                aria-label="Очистити пошук"
                                onClick={() => setSearch('')}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        },
                      }}
                    />
                    <TextField
                      className={styles.sortSelect}
                      select
                      size="small"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      aria-label="Сортування сторінок"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                  <div className={styles.filterChips} role="group" aria-label="Фільтр за типом">
                    {PAGE_TYPES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={activeTypes.includes(value)}
                        className={`${styles.filterChip} ${
                          activeTypes.includes(value) ? styles.filterChipActive : ''
                        }`}
                        onClick={() => toggleType(value)}
                      >
                        {label}
                      </button>
                    ))}
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className={styles.resetChip}
                        onClick={resetFilters}
                      >
                        Скинути ✕
                      </button>
                    )}
                  </div>
                </div>

          <div className={`${styles.pagesGrid} ${section.full ? styles.pagesGridWide : ''}`}>
            {canEdit && creating && (
            <NewPageCard
              worldId={worldId}
              accent={accent}
              form={form}
              setForm={setForm}
              saving={mutation.isPending}
              duplicate={isDuplicateTitle}
              onSave={saveCreate}
              onDiscard={discardCreate}
            />
            )}
            {visiblePages.map((page) => (
                    <div
                      key={page.id}
                      className={styles.pageCard}
                      role="link"
                      tabIndex={0}
                      aria-label={`Відкрити сторінку «${page.title}»`}
                      onClick={() => openPage(page)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openPage(page)
                        }
                      }}
                    >
                      <div className={styles.pageCardThumb}>
                        <span className={styles.pageCardEmoji}>{pageEmoji(page)}</span>
                        <span className={styles.pageCardType}>
                          {PAGE_TYPE_LABELS[page.page_type] || page.page_type}
                        </span>
                      </div>
                      <div className={styles.pageCardTitle}>{page.title}</div>
                      {page.content && (
                        <div className={styles.pageCardSnippet}>
                          {renderContent(
                            snippetOf(page.content),
                            titleIndex,
                            openPage,
                            canEdit ? openNewWithTitle : undefined,
                          )}
                        </div>
                      )}
                      <div className={styles.pageCardFooter}>
                        {page.tags && (
                          <span className={styles.tagRow}>
                            {page.tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((t, i) => (
                                <span key={i} className={styles.tag}>
                                  #{t}
                                </span>
                              ))}
                          </span>
                        )}
                        <span className={styles.pageCardUpdated}>
                          {formatDate(page.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredPages.length === 0 && !creating && (
                    <p className={styles.emptyState}>
                      {pages.length === 0
                        ? canEdit
                          ? 'Вікі ще порожня. Додай першу сторінку.'
                          : 'Вікі ще порожня.'
                        : 'Нічого не знайдено.'}
                      {pages.length > 0 && hasActiveFilters && (
                        <button
                          type="button"
                          className={styles.emptyReset}
                          onClick={resetFilters}
                        >
                          Скинути пошук і фільтри
                        </button>
                      )}
                    </p>
                  )}
                </div>

                {!section.modal && filteredPages.length > 4 && (
                  <div className={styles.showAllWrap}>
                    <button
                      type="button"
                      className={styles.showAllBtn}
                      onClick={section.open}
                    >
                      Показати всі ({filteredPages.length})
                    </button>
                  </div>
                )}
          </>
        )}
      </div>
    </div>
  )
}