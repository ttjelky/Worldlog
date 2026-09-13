import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import { useFeedback } from '../../../../shared/feedback/FeedbackProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './IdeasSection.module.css'

const ideaStatus = {
  open: ['#7DD3FC', 'Відкрита'],
  accepted: ['#8FE3A0', 'Прийнята'],
  rejected: ['#FF8A80', 'Відхилена'],
}

const empty = { title: '', content: '', status: 'open' }
const cleanTitle = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

const statusOrder = ['open', 'accepted', 'rejected']

// Бейдж статусу — видимий завжди, клік перемикає статус далі по колу
// (для редакторів; глядачі бачать статичний бейдж).
function StatusPill({ status, canEdit, onCycle, large }) {
  const [dot, label] = ideaStatus[status] || ideaStatus.open
  const style = { background: `${dot}33`, color: dot }
  const className = large ? styles.detailsStatus : styles.rowStatus
  const dotClass = large ? styles.statusDotLg : styles.statusDotSm
  if (!canEdit) {
    return (
      <span className={className} style={style}>
        <span className={dotClass} style={{ background: dot }} />
        {label}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      title={`Статус: ${label}. Натисни, щоб змінити`}
      aria-label={`Статус: ${label}. Натисни, щоб змінити`}
      onClick={(e) => {
        e.stopPropagation()
        onCycle()
      }}
    >
      <span className={dotClass} style={{ background: dot }} />
      {label}
    </button>
  )
}

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

function VoteButton({ idea, voted, onToggle, small }) {
  return (
    <button
      type="button"
      className={`${styles.voteBtn} ${voted ? styles.voteActive : ''} ${
        small ? styles.voteSmall : ''
      }`}
      aria-pressed={voted}
      aria-label={voted ? 'Прибрати голос' : 'Голосувати за ідею'}
      title={voted ? 'Прибрати голос' : 'Голосувати за ідею'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(idea)
      }}
    >
      <ArrowUpwardIcon sx={{ fontSize: 14 }} />
      {idea.votes ?? 0}
    </button>
  )
}

function ConvertButton({ idea, armed, busy, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.convertBtn} ${armed ? styles.convertArmed : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick(idea)
      }}
      disabled={busy}
      title="Перетворити ідею на проєкт"
    >
      <AutoAwesomeIcon sx={{ fontSize: 14, mr: 0.5 }} />
      {busy ? 'Перетворення…' : armed ? 'Точно перетворити?' : 'Перетворити на проєкт'}
    </button>
  )
}

function IdeaDetails({
  idea,
  worldId,
  locations,
  accent,
  canEdit,
  voted,
  onToggleVote,
  convertArmed,
  convertBusy,
  onConvert,
  onCycleStatus,
  onEdit,
  onDelete,
}) {
  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>
          <LocationBadgeText text={idea.title} worldId={worldId} locations={locations} />
        </h3>
      </div>

      {idea.content && (
        <p className={styles.detailsContent}>
          <LocationBadgeText text={idea.content} worldId={worldId} locations={locations} small />
        </p>
      )}

      <div className={styles.detailsActions}>
        <VoteButton idea={idea} voted={voted} onToggle={onToggleVote} />
        {canEdit && (
          <ConvertButton idea={idea} armed={convertArmed} busy={convertBusy} onClick={onConvert} />
        )}
        <StatusPill
          status={idea.status || 'open'}
          canEdit={canEdit}
          onCycle={() => onCycleStatus(idea)}
          large
        />
      </div>

      <div className={styles.detailsFooter}>
        <div className={styles.actionBtns}>
          <RelationshipButton
            worldId={worldId}
            sourceType="idea"
            sourceId={idea.id}
            name={idea.title}
            accent={accent}
            className={styles.actionBtn}
          />
          {canEdit && (
            <>
              <IconButton className={styles.actionBtn} aria-label="Редагувати ідею" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton className={styles.actionBtn} aria-label="Видалити ідею" onClick={onDelete}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline-редактор ідеї в дусі нотаток: назва й опис пишуться
// прямо в модалці, статус — сегмент-пігулками.
function IdeaEditor({ worldId, accent, form, setForm, saving, isNew, onSave, onCancel }) {
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
            label="Назва ідеї"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            placeholder="Назва"
            editableStyle={titleTextStyle}
          />
        </div>
        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Опис ідеї"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            multiline
            minRows={5}
            placeholder="Опиши ідею…"
            editableStyle={contentTextStyle}
          />
        </div>

        <div className={styles.statusSeg} role="group" aria-label="Статус ідеї">
          {Object.entries(ideaStatus).map(([value, [color, label]]) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.status === value}
              className={`${styles.statusFilterChip} ${
                form.status === value ? styles.statusFilterChipActive : ''
              }`}
              onClick={() => setForm((f) => ({ ...f, status: value }))}
            >
              <span className={styles.statusDot} style={{ background: color }} />
              {label}
            </button>
          ))}
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
// чернетка нової ідеї масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

// Згорнутий рядок ідеї. Редагування відкриває модалку
// цієї ж ідеї одразу в режимі редагування.
function IdeaRow({
  idea: t,
  worldId,
  locations,
  accent,
  canEdit,
  voted,
  onToggleVote,
  convertArmed,
  convertBusy,
  onConvert,
  onCycleStatus,
  onEdit,
  onDelete,
}) {
  const { open } = useExpandableCard()
  const handleEdit = (e) => {
    e.stopPropagation()
    onEdit(t)
    open()
  }

  return (
    <div className={styles.ideaItem}>
      <div className={styles.ideaContent}>
        <div className={styles.ideaTitle}>
          <span className={styles.ideaTitleText}>
            <LocationBadgeText text={t.title} worldId={worldId} locations={locations} />
          </span>
        </div>
        {t.content && (
          <div className={styles.ideaDesc}>
            <LocationBadgeText text={t.content} worldId={worldId} locations={locations} small />
          </div>
        )}
        <div className={styles.ideaActions}>
          <VoteButton idea={t} voted={voted} onToggle={onToggleVote} small />
          {canEdit && (
            <ConvertButton idea={t} armed={convertArmed} busy={convertBusy} onClick={onConvert} />
          )}
          <StatusPill
            status={t.status || 'open'}
            canEdit={canEdit}
            onCycle={() => onCycleStatus(t)}
          />
        </div>
      </div>
      <div className={styles.rowActions}>
        <RelationshipButton
          worldId={worldId}
          sourceType="idea"
          sourceId={t.id}
          name={t.title}
          accent={accent}
        />
        {canEdit && (
          <>
            <IconButton size="small" aria-label="Редагувати ідею" onClick={handleEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Видалити ідею"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(t)
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

function IdeaItemCard({
  idea,
  worldId,
  locations,
  accent,
  canEdit,
  isEditing,
  form,
  setForm,
  saving,
  voted,
  onToggleVote,
  convertArmed,
  convertBusy,
  onConvert,
  onCycleStatus,
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
          <IdeaEditor
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
          <IdeaDetails
            idea={idea}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            voted={voted}
            onToggleVote={onToggleVote}
            convertArmed={convertArmed}
            convertBusy={convertBusy}
            onConvert={() => onConvert(idea, close)}
            onCycleStatus={onCycleStatus}
            onEdit={() => onEdit(idea)}
            onDelete={() => {
              onDelete(idea)
              close()
            }}
          />
        )
      }
    >
      <IdeaRow
        idea={idea}
        worldId={worldId}
        locations={locations}
        accent={accent}
        canEdit={canEdit}
        voted={voted}
        onToggleVote={onToggleVote}
        convertArmed={convertArmed}
        convertBusy={convertBusy}
        onConvert={(t) => onConvert(t)}
        onCycleStatus={onCycleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ExpandableCard>
  )
}

function NewIdeaCard({ worldId, accent, form, setForm, saving, onSave, onDiscard }) {
  const draftTitle = cleanTitle(form.title)

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <IdeaEditor
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
      <div className={styles.ideaItem}>
        <div className={styles.ideaContent}>
          <div className={`${styles.ideaTitle} ${draftTitle ? '' : styles.draftTitle}`}>
            {draftTitle || 'Нова ідея…'}
          </div>
        </div>
      </div>
    </ExpandableCard>
  )
}

export default function IdeasSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [sortMode, setSortMode] = useState('new')
  const [confirmConvertId, setConfirmConvertId] = useState(null)
  const [convertingId, setConvertingId] = useState(null)
  const section = useExpandableCard()
  const canEdit = userRole && userRole !== 'viewer'
  const confirmTimer = useRef(null)
  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  // Голоси: джерело істини — бекенд (voted_by_me, оновлюється оптимістично
  // в спільному кеші, тому обидві копії секції показують один стан).
  // localStorage — лише fallback, коли сервер поле не повернув.
  const voteKey = `voted-ideas-${worldId}`
  const [votedIds, setVotedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(voteKey)) ?? []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(voteKey, JSON.stringify(votedIds))
    } catch {}
  }, [voteKey, votedIds])

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/ideas/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const visibleIdeas = ideas
    .filter((t) => {
      if (statusFilter && (t.status || 'open') !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (section.full && q) {
        return `${t.title || ''} ${t.content || ''}`.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) =>
      sortMode === 'top'
        ? (b.votes ?? 0) - (a.votes ?? 0) || b.id - a.id
        : // 'Нові': бекенд вже віддає newest-first (Meta ordering -created_at),
          // клієнт порядок не чіпає — лише детермінований тайбрейк при рівних датах.
          a.created_at && b.created_at
          ? new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          : 0,
    )

  const mutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? api.patch(`/worlds/${worldId}/ideas/${id}/`, payload)
        : api.post(`/worlds/${worldId}/ideas/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['ideas', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ id, dir }) => api.post(`/worlds/${worldId}/ideas/${id}/${dir}/`),
    onMutate: async ({ id, dir }) => {
      const key = ['ideas', String(worldId)]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      const delta = dir === 'vote' ? 1 : -1
      qc.setQueryData(key, (old) =>
        (old ?? []).map((x) =>
          x.id === id
            ? { ...x, votes: Math.max(0, (x.votes ?? 0) + delta), voted_by_me: dir === 'vote' }
            : x,
        ),
      )
      return { prev }
    },
    onError: (_err, vars, ctx) => {
      const key = ['ideas', String(worldId)]
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      setVotedIds((cur) =>
        vars.dir === 'vote' ? cur.filter((x) => x !== vars.id) : [...cur, vars.id],
      )
    },
    onSettled: () => qc.invalidateQueries(['ideas', String(worldId)]),
  })

  const toggleVote = (idea) => {
    if (voteMutation.isPending) return
    // Бекенд — джерело істини, localStorage — лише оптимістичний кеш.
    const has = idea.voted_by_me ?? votedIds.includes(idea.id)
    setVotedIds(has ? votedIds.filter((x) => x !== idea.id) : [...votedIds, idea.id])
    voteMutation.mutate({ id: idea.id, dir: has ? 'unvote' : 'vote' })
  }

  // Швидка зміна статусу кліком по бейджу: open → accepted → rejected.
  const statusMutation = useMutation({
    mutationFn: ({ id, status: next }) =>
      api.patch(`/worlds/${worldId}/ideas/${id}/`, { status: next }),
    onMutate: async ({ id, status: next }) => {
      const key = ['ideas', String(worldId)]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      qc.setQueryData(key, (old) =>
        (old ?? []).map((x) => (x.id === id ? { ...x, status: next } : x)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['ideas', String(worldId)], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries(['ideas', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const cycleStatus = (idea) => {
    if (statusMutation.isPending) return
    const cur = idea.status || 'open'
    const next = statusOrder[(statusOrder.indexOf(cur) + 1) % statusOrder.length]
    statusMutation.mutate({ id: idea.id, status: next })
  }

  const undo = useUndo()
  const { notify } = useFeedback()
  const deleteIdea = (t) =>
    undo.deleteItem({
      id: t.id,
      url: `/worlds/${worldId}/ideas/${t.id}/`,
      queryKeys: [
        ['ideas', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Ідею «${t.title}» видалено`,
      nouns: ['ідея', 'ідеї', 'ідей'],
    })

  const convertMutation = useMutation({
    mutationFn: async (idea) => {
      const { data: project } = await api.post(`/worlds/${worldId}/projects/`, {
        title: idea.title,
        description: idea.content,
      })
      try {
        await api.delete(`/worlds/${worldId}/ideas/${idea.id}/`)
      } catch (err) {
        // Відкат: проєкт створено, а ідея не видалилась — прибираємо проєкт.
        await api
          .delete(`/worlds/${worldId}/projects/${project.id}/`)
          .catch(() => {})
        throw err
      }
      return project
    },
    onSuccess: () => {
      qc.invalidateQueries(['ideas', String(worldId)])
      qc.invalidateQueries(['projects', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
      notify('Ідею перетворено на проєкт')
    },
    onError: () => {
      notify('Не вдалося перетворити ідею')
    },
  })

  // Двоступеневе підтвердження прямо на кнопці замість window.confirm.
  const requestConvert = (idea, after) => {
    if (convertingId) return
    if (confirmConvertId !== idea.id) {
      setConfirmConvertId(idea.id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmConvertId(null), 4000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmConvertId(null)
    setConvertingId(idea.id)
    convertMutation.mutate(idea, {
      onSuccess: () => {
        setConvertingId(null)
        after?.()
      },
      onError: () => setConvertingId(null),
    })
  }

  const openNew = () => {
    setEditingId(null)
    setForm(empty)
    setCreating(true)
  }
  const openEdit = (t) => {
    setCreating(false)
    setEditingId(t.id)
    setForm({ title: t.title, content: t.content || '', status: t.status || 'open' })
  }
  // Скидання при закритті модалки будь-яким способом
  // (фон, Escape): незбережені зміни відкидаються.
  const discardEdit = () => setEditingId(null)
  const discardCreate = () => {
    setCreating(false)
    setForm(empty)
  }
  // Редагування лишає модалку відкритою — повертаємось до перегляду.
  const saveEdit = () => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: editingId, payload: { ...form, title } },
      { onSuccess: () => setEditingId(null) },
    )
  }
  // Створення закриває модалку — нова ідея лишається у списку.
  const saveCreate = (close) => {
    const title = cleanTitle(form.title)
    if (!title || mutation.isPending) return
    mutation.mutate(
      { id: null, payload: { ...form, title } },
      { onSuccess: () => close() },
    )
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Ідеї ({ideas.length})
        </h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Нова ідея
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
              placeholder="Знайти ідею…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук ідеї"
            />
          </div>
          <div className={styles.statusChips} role="group" aria-label="Фільтр за статусом">
            {Object.entries(ideaStatus).map(([value, [color, label]]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                className={`${styles.statusFilterChip} ${
                  statusFilter === value ? styles.statusFilterChipActive : ''
                }`}
                onClick={() => setStatusFilter(statusFilter === value ? null : value)}
              >
                <span className={styles.statusDot} style={{ background: color }} />
                {label}
              </button>
            ))}
          </div>
          <div className={styles.sortRow} role="group" aria-label="Сортування ідей">
            {[
              ['new', 'Спочатку нові'],
              ['top', 'Топ за голосами'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sortMode === value}
                className={`${styles.sortChip} ${sortMode === value ? styles.sortChipActive : ''}`}
                onClick={() => setSortMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        className={`${sharedStyles.body} ${styles.ideaList} ${
          section.modal ? styles.ideaListFull : ''
        } ${section.full ? styles.ideaListWide : ''}`}
      >
        {canEdit && creating && (
          <NewIdeaCard
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onSave={saveCreate}
            onDiscard={discardCreate}
          />
        )}
        {visibleIdeas.map((t) => (
          <IdeaItemCard
            key={t.id}
            idea={t}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            isEditing={editingId === t.id}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            voted={t.voted_by_me ?? votedIds.includes(t.id)}
            onToggleVote={toggleVote}
            convertArmed={confirmConvertId === t.id}
            convertBusy={convertingId === t.id}
            onConvert={requestConvert}
            onCycleStatus={cycleStatus}
            onEdit={openEdit}
            onSave={saveEdit}
            onCancelEdit={discardEdit}
            onDelete={deleteIdea}
            onDiscardEdit={discardEdit}
          />
        ))}
        {visibleIdeas.length === 0 && !creating && (
          <p className={sharedStyles.emptyMsg}>
            {ideas.length === 0 ? 'Ідей поки немає. Додай першу ідею.' : 'Нічого не знайдено.'}
          </p>
        )}
      </div>
    </div>
  )
}
