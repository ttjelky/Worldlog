import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './NotesSection.module.css'

const empty = { title: '', content: '', tags: '' }

const parseTags = (tags) =>
  tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

function NoteDetails({ note, worldId, locations, accent, canEdit, onEdit, onDelete }) {
  const tags = parseTags(note.tags)

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>
          <LocationBadgeText text={note.title} worldId={worldId} locations={locations} />
        </h3>
      </div>
      {tags.length > 0 && (
        <div className={styles.detailsTags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.detailsTag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.content && (
        <p className={styles.detailsContent}>
          <LocationBadgeText text={note.content} worldId={worldId} locations={locations} small />
        </p>
      )}

      <div className={styles.detailsFooter}>
        <div className={styles.actionBtns}>
          <RelationshipButton
            worldId={worldId}
            sourceType="note"
            sourceId={note.id}
            name={note.title}
            accent={accent}
            className={styles.actionBtn}
          />
          {canEdit && (
            <>
              <IconButton className={styles.actionBtn} aria-label="Редагувати нотатку" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton className={styles.actionBtn} aria-label="Видалити нотатку" onClick={onDelete}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Редактор нотатки в дусі Notion/Apple Notes — показується в ТІЙ САМІЙ
// розгорнутій модалці замість перегляду: жодних рамок-інпутів, назва й зміст
// пишуться прямо в тексті нотатки.
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

// Заголовок — один рядок: переноси з contenteditable зливаємо в пробіли.
const cleanTitle = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

// Теги в режимі редагування: бейджики з хрестиком для видалення
// та кнопка «+» для додавання нового.
function TagsEditor({ tags, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const parts = draft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (parts.length > 0) onAdd(parts)
    setDraft('')
    setAdding(false)
  }
  const cancel = () => {
    setDraft('')
    setAdding(false)
  }

  return (
    <div className={styles.editTags}>
      {tags.map((tag) => (
        <span key={tag} className={styles.editTag}>
          {tag}
          <button
            type="button"
            className={styles.tagRemove}
            aria-label={`Видалити тег «${tag}»`}
            onClick={() => onRemove(tag)}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          type="text"
          className={styles.tagInput}
          aria-label="Новий тег"
          placeholder="Назва тега…"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              commit()
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              cancel()
            }
          }}
          onBlur={commit}
        />
      ) : (
        <button
          type="button"
          className={styles.addTagBtn}
          aria-label="Додати тег"
          title="Додати тег"
          onClick={() => setAdding(true)}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </button>
      )}
    </div>
  )
}

function NoteEditor({ worldId, accent, form, setForm, saving, isNew, onSave, onCancel }) {
  const canSave = cleanTitle(form.title).length > 0 && !saving
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

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <form onSubmit={submit} onKeyDown={onKeyDown} className={styles.editorForm}>
        <div className={styles.detailsHead}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Назва нотатки"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            placeholder="Назва"
            editableStyle={titleTextStyle}
          />
        </div>
        <TagsEditor
          tags={parseTags(form.tags)}
          onAdd={(parts) =>
            setForm((f) => {
              const next = [...parseTags(f.tags)]
              for (const p of parts) if (!next.includes(p)) next.push(p)
              return { ...f, tags: next.join(', ') }
            })
          }
          onRemove={(tag) =>
            setForm((f) => ({
              ...f,
              tags: parseTags(f.tags)
                .filter((t) => t !== tag)
                .join(', '),
            }))
          }
        />
        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Зміст нотатки"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            multiline
            minRows={6}
            placeholder="Почніть писати…"
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
// чернетка нової нотатки масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

// Згорнутий рядок нотатки. Редагування відкриває модалку
// цієї ж нотатки одразу в режимі редагування.
function NoteRow({ note, worldId, locations, accent, canEdit, onEdit, onDelete }) {
  const { open } = useExpandableCard()
  const handleEdit = (e) => {
    e.stopPropagation()
    onEdit(note)
    open()
  }

  return (
    <div className={styles.noteItem}>
      <div className={styles.noteContent}>
        <div className={styles.noteTitle}>
          <LocationBadgeText text={note.title} worldId={worldId} locations={locations} />
        </div>
        {note.content && (
          <div className={styles.noteDesc}>
            <LocationBadgeText text={note.content} worldId={worldId} locations={locations} small />
          </div>
        )}
        {note.tags && (
          <div className={styles.noteTags}>
            {parseTags(note.tags).map((tag) => (
              <span key={tag} className={styles.noteTag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.rowActions}>
        <RelationshipButton
          worldId={worldId}
          sourceType="note"
          sourceId={note.id}
          name={note.title}
          accent={accent}
        />
        {canEdit && (
          <>
            <IconButton size="small" aria-label="Редагувати нотатку" onClick={handleEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Видалити нотатку"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(note)
              }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </div>
    </div>
  )
}

function NoteItemCard({
  note,
  worldId,
  locations,
  accent,
  canEdit,
  isEditing,
  form,
  setForm,
  saving,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onDiscardEdit,
}) {
  return (
    <ExpandableCard
      clickOpens
      showExpandBtn={false}
      onClose={onDiscardEdit}
      expandedContent={({ close }) =>
        isEditing ? (
          <NoteEditor
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={saving}
            isNew={false}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <NoteDetails
            note={note}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            onEdit={() => onEdit(note)}
            onDelete={() => {
              onDelete(note)
              close()
            }}
          />
        )
      }
    >
      <NoteRow
        note={note}
        worldId={worldId}
        locations={locations}
        accent={accent}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ExpandableCard>
  )
}

function NewNoteCard({ worldId, accent, form, setForm, saving, onSave, onDiscard }) {
  const draftTitle = form.title.trim()

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <NoteEditor
          worldId={worldId}
          accent={accent}
          form={form}
          setForm={setForm}
          saving={saving}
          isNew
          onSave={() => onSave(close)}
          onCancel={close}
        />
      )}
    >
      <AutoOpen />
      <div className={styles.noteItem}>
        <div className={styles.noteContent}>
          <div className={`${styles.noteTitle} ${draftTitle ? '' : styles.draftTitle}`}>
            {draftTitle || 'Нова нотатка…'}
          </div>
        </div>
      </div>
    </ExpandableCard>
  )
}

export default function NotesSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [activeTag, setActiveTag] = useState(null)
  const [search, setSearch] = useState('')
  const section = useExpandableCard()
  const canEdit = userRole && userRole !== 'viewer'

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/notes/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)

  const mutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? api.patch(`/worlds/${worldId}/notes/${id}/`, payload)
        : api.post(`/worlds/${worldId}/notes/`, payload),
    onSuccess: () => qc.invalidateQueries(['notes', String(worldId)]),
  })

  const undo = useUndo()
  const deleteNote = (n) =>
    undo.deleteItem({
      id: n.id,
      url: `/worlds/${worldId}/notes/${n.id}/`,
      queryKeys: [
        ['notes', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Нотатку «${n.title}» видалено`,
      nouns: ['нотатку', 'нотатки', 'нотаток'],
    })

  const openNew = () => {
    setEditingId(null)
    setForm(empty)
    setCreating(true)
  }
  const openEdit = (n) => {
    setEditingId(n.id)
    setForm({ title: n.title, content: n.content || '', tags: n.tags || '' })
  }
  // Скидання при закритті модалки будь-яким способом
  // (фон, Escape): незбережені зміни відкидаються.
  const discardEdit = () => setEditingId(null)
  const discardCreate = () => {
    setCreating(false)
    setForm(empty)
  }
  // Збереження редагування лишає модалку відкритою — повертаємось до перегляду.
  const saveEdit = () => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: editingId, payload: { ...form, title } },
      { onSuccess: () => setEditingId(null) },
    )
  }
  // Створення закриває модалку — нова нотатка лишається у списку.
  const saveCreate = (close) => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: null, payload: { ...form, title } },
      { onSuccess: () => close() },
    )
  }

  const allTags = [...new Set(notes.flatMap((n) => parseTags(n.tags)))]
  const filteredNotes = notes.filter((n) => {
    if (activeTag && !parseTags(n.tags).includes(activeTag)) return false
    const q = search.trim().toLowerCase()
    if (section.full && q) {
      return `${n.title || ''} ${n.content || ''} ${n.tags || ''}`.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Нотатки ({notes.length})
        </h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Нова нотатка
          </Button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className={styles.tagFilter}>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTag === tag}
              className={`${styles.tagFilterBtn} ${activeTag === tag ? styles.tagFilterActive : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {section.full && (
        <div className={sharedStyles.searchWrap}>
          <SearchIcon className={sharedStyles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={sharedStyles.wideSearch}
            placeholder="Знайти нотатку…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Пошук нотатки"
          />
        </div>
      )}

      <div
        className={`${sharedStyles.body} ${styles.noteList} ${section.modal ? styles.noteListFull : ''} ${
          section.full ? styles.noteListWide : ''
        }`}
      >
        {canEdit && creating && (
          <NewNoteCard
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onSave={saveCreate}
            onDiscard={discardCreate}
          />
        )}
        {filteredNotes.map((n) => (
          <NoteItemCard
            key={n.id}
            note={n}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            isEditing={editingId === n.id}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onEdit={openEdit}
            onSave={saveEdit}
            onCancelEdit={discardEdit}
            onDelete={deleteNote}
            onDiscardEdit={discardEdit}
          />
        ))}
        {filteredNotes.length === 0 && !creating && (
          <p className={sharedStyles.emptyMsg}>
            {notes.length === 0 ? 'Нотаток ще немає. Додай першу.' : 'Нічого не знайдено.'}
          </p>
        )}
      </div>
    </div>
  )
}
