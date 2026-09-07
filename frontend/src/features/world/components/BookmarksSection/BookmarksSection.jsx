import { useState } from 'react'
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
import api from '../../../../api'
import { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import { useFeedback } from '../../../../shared/feedback/FeedbackProvider'
import styles from './BookmarksSection.module.css'

const empty = { title: '', url: '', description: '' }

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export default function BookmarksSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const canEdit = userRole && userRole !== 'viewer'

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/bookmarks/`).then((r) => r.data),
  })
  const visibleBookmarks =
    section.full && search.trim()
      ? bookmarks.filter((b) =>
          `${b.title || ''} ${b.url || ''} ${b.description || ''}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
      : bookmarks
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/bookmarks/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/bookmarks/`, payload),
    onSuccess: () => qc.invalidateQueries(['bookmarks', String(worldId)]),
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
    setForm({ title: '', description: '', url: '', ...b })
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
        <input
          type="search"
          className={sharedStyles.wideSearch}
          placeholder="Знайти закладку…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Пошук закладки"
        />
      )}

      <div
        className={`${sharedStyles.body} ${styles.bookmarkList} ${
          section.modal ? styles.bookmarkListFull : ''
        } ${section.full ? styles.bookmarkListWide : ''}`}
      >
        {visibleBookmarks.map((b) => {
          const domain = domainOf(b.url)
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
                <OpenInNewIcon fontSize="small" />
              </div>
              <div className={styles.bookmarkInfo}>
                <div className={styles.bookmarkTitleRow}>
                  <div className={styles.bookmarkTitle}>{b.title}</div>
                  {domain && <span className={styles.domainBadge}>{domain}</span>}
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
              />
              <TextField
                label="Опис"
                value={form.description}
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
