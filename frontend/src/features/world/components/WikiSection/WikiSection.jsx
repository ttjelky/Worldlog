import { useMemo, useState } from 'react'
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

const empty = { title: '', page_type: 'location', content: '' }

function renderContent(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const parts = line.split(/(\[\[wiki:[^\]]+\]\])/g)
    return (
      <span key={i}>
        {parts.map((part, j) => {
          const m = part.match(/^\[\[wiki:(.+)\]\]$/)
          if (m) {
            return (
              <span key={j} className={styles.pageDetailLink}>
                {m[1]}
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

export default function WikiSection({ worldId, accent }) {
  const qc = useQueryClient()
  const section = useExpandableCard()

  const [selectedPage, setSelectedPage] = useState(null)
  const [editingPage, setEditingPage] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(null)

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
      queryKeys: [['wiki', String(worldId)], ['world', String(worldId)]],
      message: `Сторінку «${p.title}» видалено`,
      nouns: ['сторінку', 'сторінки', 'сторінок'],
    })

  const filteredPages = useMemo(() => {
    let result = pages
    if (activeFilter) {
      result = result.filter((p) => p.page_type === activeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.content && p.content.toLowerCase().includes(q)),
      )
    }
    return result
  }, [pages, activeFilter, search])

  const visiblePages = section.modal ? filteredPages : filteredPages.slice(0, 4)

  const openNew = () => {
    setEditingPage(null)
    setForm(empty)
    setDialogOpen(true)
  }

  const openEdit = (page) => {
    setEditingPage(page)
    setForm({ title: page.title, page_type: page.page_type, content: page.content || '' })
    setDialogOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    mutation.mutateAsync(form)
  }

  const openPage = (page) => {
    setSelectedPage(page)
  }

  const goBack = () => {
    setSelectedPage(null)
  }

  if (selectedPage && !section.modal) {
    const TypeIcon = PAGE_TYPE_ICONS[selectedPage.page_type] || DescriptionIcon
    return (
      <div className={sharedStyles.card} style={{ '--accent': accent }}>
        <div className={styles.pageDetail}>
          <button className={styles.backBtn} onClick={goBack}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
            Назад
          </button>
          <div className={styles.pageDetailHeader}>
            <h3 className={styles.pageDetailTitle}>{selectedPage.title}</h3>
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
          </div>
          <div className={styles.pageDetailMeta}>
            <span className={styles.pageDetailTypeChip}>
              <TypeIcon sx={{ fontSize: 14 }} />
              {PAGE_TYPE_LABELS[selectedPage.page_type] || selectedPage.page_type}
            </span>
            {selectedPage.updated_at && (
              <span className={styles.pageDetailDates}>
                Оновлено: {new Date(selectedPage.updated_at).toLocaleDateString('uk-UA')}
              </span>
            )}
          </div>
          <div className={styles.pageDetailContent}>
            {renderContent(selectedPage.content)}
          </div>
          <RelationshipList worldId={worldId} sourceType="wiki_page" sourceId={selectedPage.id} />
        </div>

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
            <DialogTitle>
              {editingPage ? 'Редагувати сторінку' : 'Нова сторінка'}
            </DialogTitle>
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
                  onChange={(e) => setForm((f) => ({ ...f, page_type: e.target.value }))}
                >
                  {PAGE_TYPES.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Зміст"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  multiline
                  minRows={6}
                />
              </div>
            </DialogContent>
            <DialogActions className={sharedStyles.dialogActions}>
              <Button
                onClick={() => setDialogOpen(false)}
                className={sharedStyles.dialogBtnCancel}
              >
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

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Вікі ({pages.length})</h3>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNew}>
          Нова сторінка
        </Button>
      </div>

      <div className={`${sharedStyles.body} ${styles.wikiContent}`}>
        {selectedPage ? (
          <div className={styles.pageDetail}>
            <button className={styles.backBtn} onClick={goBack}>
              <ArrowBackIcon sx={{ fontSize: 18 }} />
              Назад
            </button>
            <div className={styles.pageDetailHeader}>
              <h3 className={styles.pageDetailTitle}>{selectedPage.title}</h3>
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
            </div>
            <div className={styles.pageDetailMeta}>
              {(() => {
                const TypeIcon = PAGE_TYPE_ICONS[selectedPage.page_type] || DescriptionIcon
                return (
                  <span className={styles.pageDetailTypeChip}>
                    <TypeIcon sx={{ fontSize: 14 }} />
                    {PAGE_TYPE_LABELS[selectedPage.page_type] || selectedPage.page_type}
                  </span>
                )
              })()}
              {selectedPage.updated_at && (
                <span className={styles.pageDetailDates}>
                  Оновлено: {new Date(selectedPage.updated_at).toLocaleDateString('uk-UA')}
                </span>
              )}
            </div>
            <div className={styles.pageDetailContent}>
              {renderContent(selectedPage.content)}
            </div>
            <RelationshipList worldId={worldId} sourceType="wiki_page" sourceId={selectedPage.id} />
          </div>
        ) : (
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
              <div className={styles.filterChips}>
                {PAGE_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    className={`${styles.filterChip} ${
                      activeFilter === value ? styles.filterChipActive : ''
                    }`}
                    onClick={() => setActiveFilter(activeFilter === value ? null : value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.pagesGrid}>
              {visiblePages.map((page) => (
                <div
                  key={page.id}
                  className={styles.pageCard}
                  onClick={() => openPage(page)}
                >
                  <div className={styles.pageCardTitle}>{page.title}</div>
                  <span className={styles.pageCardType}>
                    {PAGE_TYPE_LABELS[page.page_type] || page.page_type}
                  </span>
                  {page.content && (
                    <div className={styles.pageCardSnippet}>{page.content}</div>
                  )}
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
      </div>

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
          <DialogTitle>
            {editingPage ? 'Редагувати сторінку' : 'Нова сторінка'}
          </DialogTitle>
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
                onChange={(e) => setForm((f) => ({ ...f, page_type: e.target.value }))}
              >
                {PAGE_TYPES.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Зміст"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                multiline
                minRows={6}
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button
              onClick={() => setDialogOpen(false)}
              className={sharedStyles.dialogBtnCancel}
            >
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
