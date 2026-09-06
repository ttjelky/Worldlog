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
import api from '../../../../api'
import { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import styles from './BookmarksSection.module.css'

const empty = { title: '', url: '', description: '' }

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
    setForm({ ...b })
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
        {visibleBookmarks.map((b) => (
          <div
            key={b.id}
            className={styles.bookmarkItem}
            onClick={() => window.open(b.url, '_blank')}
          >
            <div className={styles.bookmarkIcon}>
              <OpenInNewIcon fontSize="small" />
            </div>
            <div className={styles.bookmarkInfo}>
              <div className={styles.bookmarkTitle}>{b.title}</div>
              <div className={styles.bookmarkUrl}>{b.url}</div>
            </div>
            <div className={styles.rowActions}>
              <RelationshipButton
                worldId={worldId}
                sourceType="bookmark"
                sourceId={b.id}
                name={b.title}
                accent={accent}
              />
              {canEdit && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(b)
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
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
        ))}
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
