import { useEffect, useMemo, useRef, useState } from 'react'
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
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
import { useExpandableCard } from '../shared/ExpandableCard'
import RelationshipList from '../shared/RelationshipList'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import WikiGraph from './WikiGraph'
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

const WIKI_LINK_RE = /\[\[(?:wiki:)?([^\]|]+)\]\]/g

function extractTitles(text) {
  if (!text) return []
  const out = []
  const re = new RegExp(WIKI_LINK_RE.source, 'g')
  let m
  while ((m = re.exec(text))) out.push(m[1].trim())
  return out
}

function renderContent(text, titleIndex, onOpen) {
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
            return (
              <span
                key={j}
                className={target ? styles.pageDetailLink : styles.pageDetailLinkBroken}
                onClick={(e) => {
                  e.stopPropagation()
                  if (target) onOpen?.(target)
                }}
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
  world_date_order: '',
  content: '',
}

export default function WikiSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()

  const [selectedPage, setSelectedPage] = useState(null)
  const [editingPage, setEditingPage] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [activeTypes, setActiveTypes] = useState([])
  const [sort, setSort] = useState('updated')
  const [view, setView] = useState('list')
  const [activeFilter, setActiveFilter] = useState(null)
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
    mutationFn: (payload) =>
      editingPage
        ? api.patch(`/worlds/${worldId}/wiki/${editingPage.id}/`, payload)
        : api.post(`/worlds/${worldId}/wiki/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['wiki', String(worldId)])
      setDialogOpen(false)
      setEditingPage(null)
      setForm(empty)
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
    () => new Map(pages.map((p) => [p.title.toLowerCase(), p])),
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

  const timelinePages = useMemo(
    () =>
      pages
        .filter((p) => ['event', 'war'].includes(p.page_type))
        .sort((a, b) => {
          const ao = a.world_date_order ?? Number.MAX_SAFE_INTEGER
          const bo = b.world_date_order ?? Number.MAX_SAFE_INTEGER
          if (ao !== bo) return ao - bo
          return a.id - b.id
        }),
    [pages],
  )

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
    setDialogOpen(true)
  }

  const openEdit = (page) => {
    setEditingPage(page)
    setForm({
      title: page.title,
      page_type: page.page_type,
      emoji: page.emoji || EMOJI_BY_TYPE[page.page_type] || EMOJI_FALLBACK,
      infobox: page.infobox || {},
      tags: page.tags || '',
      world_date: page.world_date || '',
      world_date_order: page.world_date_order != null ? page.world_date_order : '',
      content: page.content || '',
    })
    setDialogOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    const infobox = Object.fromEntries(
      Object.entries(form.infobox).filter(([, v]) => String(v || '').trim() !== ''),
    )
    const payload = {
      title: form.title,
      page_type: form.page_type,
      emoji: form.emoji,
      infobox,
      tags: form.tags,
      world_date: form.world_date,
      world_date_order:
        form.world_date_order !== '' && form.world_date_order != null
          ? Number(form.world_date_order)
          : null,
      content: form.content,
    }
    mutation.mutateAsync(payload)
  }

  const openPage = (page) => {
    setSelectedPage(page)
    if (!section.modal) section.open()
  }
  const openPageById = (id) => {
    const page = pages.find((p) => p.id === id)
    if (page) setSelectedPage(page)
  }
  const goBack = () => setSelectedPage(null)

  const toggleType = (value) =>
    setActiveTypes((cur) =>
      cur.includes(value) ? cur.filter((t) => t !== value) : [...cur, value],
    )

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
        <button className={styles.backBtn} onClick={goBack}>
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
                    style={{ backgroundColor: `${statusColor}26`, color: statusColor }}
                  >
                    {STATUS_OPTIONS[statusValue]}
                  </span>
                )}
                {selectedPage.world_date && (
                  <span className={styles.pageDetailDate}>📅 {selectedPage.world_date}</span>
                )}
                {selectedPage.updated_at && (
                  <span className={styles.pageDetailDates}>
                    Оновлено: {new Date(selectedPage.updated_at).toLocaleDateString('uk-UA')}
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
            {renderContent(selectedPage.content, titleIndex, openPage)}
          </div>
        )}

        {nestedChildren.length > 0 && (
          <div className={styles.nestedBlock}>
            <h4 className={styles.nestedBlockTitle}>Вкладені сторінки</h4>
            <div className={styles.nestedLinks}>
              {nestedChildren.map(({ page, label }) => (
                <button
                  key={`${page.id}-${label}`}
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
                <button key={page.id} className={styles.nestedLink} onClick={() => openPage(page)}>
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

  const renderDialog = () => (
    <Dialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle>{editingPage ? 'Редагувати сторінку' : 'Нова сторінка'}</DialogTitle>
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
              label="Тип"
              select
              value={form.page_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  page_type: e.target.value,
                  emoji: f.emoji || EMOJI_BY_TYPE[e.target.value],
                }))
              }
            >
              {PAGE_TYPES.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            <div className={styles.emojiRow}>
              <span className={styles.emojiLabel}>Емодзі</span>
              <div className={styles.emojiPicker}>
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={`${styles.emojiBtn} ${form.emoji === em ? styles.emojiBtnActive : ''}`}
                    onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {(INFOBOX_SCHEMAS[form.page_type] || []).map(
              (field) =>
                field.options ? (
                  <TextField
                    key={field.key}
                    label={field.label}
                    select
                    value={form.infobox[field.key] || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        infobox: { ...f.infobox, [field.key]: e.target.value },
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>— обери —</em>
                    </MenuItem>
                    {Object.entries(field.options).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    key={field.key}
                    label={field.label}
                    value={form.infobox[field.key] || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        infobox: { ...f.infobox, [field.key]: e.target.value },
                      }))
                    }
                  />
                ),
            )}

            <TextField
              label="Теги (через кому)"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
            <div className={styles.dateRow}>
              <TextField
                label="Дата в ігровому світі"
                placeholder="Рік 3, Весна"
                value={form.world_date}
                onChange={(e) => setForm((f) => ({ ...f, world_date: e.target.value }))}
              />
              <TextField
                label="Порядок на таймлайні"
                type="number"
                value={form.world_date_order}
                onChange={(e) => setForm((f) => ({ ...f, world_date_order: e.target.value }))}
              />
            </div>
            <TextField
              label="Зміст"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              multiline
              minRows={6}
              placeholder="Посилання на інші сторінки: [[Назва]]"
            />
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={() => setDialogOpen(false)} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
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
          renderPageDetail()
        ) : (
          <>
            <div className={styles.viewTabs}>
              <button
                className={`${styles.viewTab} ${view === 'list' ? styles.viewTabActive : ''}`}
                onClick={() => setView('list')}
              >
                Сторінки
              </button>
              <button
                className={`${styles.viewTab} ${view === 'timeline' ? styles.viewTabActive : ''}`}
                onClick={() => setView('timeline')}
              >
                Таймлайн
              </button>
              <button
                className={`${styles.viewTab} ${view === 'graph' ? styles.viewTabActive : ''}`}
                onClick={() => setView('graph')}
              >
                Зв&apos;язки
              </button>
            </div>

            {view === 'list' && (
              <>
                <div className={styles.toolbar}>
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
                      },
                    }}
                  />
                  <TextField
                    className={styles.sortSelect}
                    select
                    size="small"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <MenuItem value="updated">Спочатку оновлені</MenuItem>
                    <MenuItem value="alpha">За назвою</MenuItem>
                    <MenuItem value="created">Спочатку створені</MenuItem>
                  </TextField>
                  <div className={styles.filterChips}>
                    {PAGE_TYPES.map(([value, label]) => (
                      <button
                        key={value}
                        className={`${styles.filterChip} ${
                          activeTypes.includes(value) ? styles.filterChipActive : ''
                        }`}
                        onClick={() => toggleType(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.pagesGrid}>
                  {visiblePages.map((page) => (
                    <div key={page.id} className={styles.pageCard} onClick={() => openPage(page)}>
                      <div className={styles.pageCardThumb}>
                        <span className={styles.pageCardEmoji}>{pageEmoji(page)}</span>
                        <span className={styles.pageCardType}>
                          {PAGE_TYPE_LABELS[page.page_type] || page.page_type}
                        </span>
                      </div>
                      <div className={styles.pageCardTitle}>{page.title}</div>
                      {page.content && (
                        <div className={styles.pageCardSnippet}>
                          {renderContent(page.content, titleIndex, openPage)}
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
                          {new Date(page.updated_at).toLocaleDateString('uk-UA')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredPages.length === 0 && (
                    <p className={styles.emptyState}>
                      {pages.length === 0
                        ? 'Вікі ще порожня. Додай першу сторінку.'
                        : 'Нічого не знайдено.'}
                    </p>
                  )}
                </div>

                {!section.modal && filteredPages.length > 4 && (
                  <button type="button" className={styles.filterChip} onClick={section.open}>
                    Показати всі ({filteredPages.length})
                  </button>
                )}
              </>
            )}

            {view === 'timeline' && (
              <div className={styles.timeline}>
                {timelinePages.length === 0 ? (
                  <p className={styles.emptyState}>
                    Додай сторінки типу «Подія» чи «Війна», щоб вони вишикувались на таймлайні.
                  </p>
                ) : (
                  timelinePages.map((page, i) => (
                    <div key={page.id} className={styles.timelineItem}>
                      <div className={styles.timelineRail}>
                        <span className={styles.timelineDot} />
                        {i < timelinePages.length - 1 && <span className={styles.timelineLine} />}
                      </div>
                      <button className={styles.timelineCard} onClick={() => openPage(page)}>
                        <div className={styles.timelineCardTitle}>
                          {pageEmoji(page)} {page.title}
                          <span className={styles.pageCardType}>
                            {PAGE_TYPE_LABELS[page.page_type] || page.page_type}
                          </span>
                        </div>
                        <div className={styles.timelineDate}>
                          {page.world_date || 'Дата не вказана'}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {view === 'graph' && <WikiGraph worldId={worldId} onOpen={openPageById} />}
          </>
        )}
      </div>

      {renderDialog()}
    </div>
  )
}