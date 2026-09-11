import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import sharedStyles from '../shared/section.module.css'
import RelationshipButton from '../shared/RelationshipButton'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import LocationBadgeText from '../shared/LocationBadgeText'
import { useLocations } from '../shared/locationData'
import styles from './PlayersSection.module.css'

const playerStatus = {
  alive: ['#8FE3A0', 'Живий'],
  dead: ['#FF8A80', 'Загинув'],
  missing: ['#FFE29A', 'Зник'],
}

const empty = { nickname: '', role_note: '', status: 'alive', avatar: null, clearAvatar: false }
const cleanName = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

const titleTextStyle = {
  fontSize: 'clamp(24px, 4vw, 36px)',
  fontWeight: 500,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#ffffff',
}

const roleTextStyle = {
  fontSize: '15px',
  lineHeight: 1.55,
  color: 'rgba(255, 255, 255, 0.85)',
}

function PlayerAvatar({ src, name, size, dead }) {
  return (
    <Avatar
      src={src || undefined}
      className={`${styles.avatar} ${size === 'lg' ? styles.avatarLg : ''} ${
        dead ? styles.avatarDead : ''
      }`}
    >
      {(name || '?')[0].toUpperCase()}
    </Avatar>
  )
}

function PlayerDetails({ player, worldId, locations, accent, canEdit, onEdit, onDelete }) {
  const status = player.status || 'alive'
  const [dot, label] = playerStatus[status] || playerStatus.alive

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <div className={styles.detailsHead}>
        <PlayerAvatar src={player.avatar} name={player.nickname} size="lg" dead={status === 'dead'} />
        <h3 className={styles.detailsTitle}>
          <LocationBadgeText text={player.nickname} worldId={worldId} locations={locations} />
        </h3>
        {status !== 'alive' && (
          <span
            className={styles.detailsStatus}
            style={{ background: `${dot}33`, color: dot }}
          >
            {label}
          </span>
        )}
      </div>

      {player.role_note && (
        <p className={styles.detailsRole}>
          <LocationBadgeText text={player.role_note} worldId={worldId} locations={locations} small />
        </p>
      )}

      <div className={styles.detailsFooter}>
        <div className={styles.actionBtns}>
          <RelationshipButton
            worldId={worldId}
            sourceType="player"
            sourceId={player.id}
            name={player.nickname}
            accent={accent}
            className={styles.actionBtn}
          />
          {canEdit && (
            <>
              <IconButton className={styles.actionBtn} aria-label="Редагувати гравця" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton className={styles.actionBtn} aria-label="Видалити гравця" onClick={onDelete}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline-редактор гравця в дусі нотаток: нік і роль пишуться
// прямо в модалці, аватар — з живим превʼю.
function PlayerEditor({
  worldId,
  accent,
  form,
  setForm,
  saving,
  isNew,
  currentAvatarUrl,
  onSave,
  onCancel,
}) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if (!(form.avatar instanceof File)) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(form.avatar)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.avatar])

  const shownAvatar = preview || (!form.clearAvatar ? currentAvatarUrl : null)
  const canSave = cleanName(form.nickname).length > 0 && !saving
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
        <div className={styles.avatarBlock}>
          <PlayerAvatar src={shownAvatar} name={form.nickname} size="lg" dead={false} />
          <div className={styles.avatarBtns}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              aria-label="Обрати аватар"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  avatar: e.target.files?.[0] || null,
                  clearAvatar: false,
                }))
              }
            />
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => fileRef.current?.click()}
            >
              {shownAvatar ? 'Змінити' : 'Додати фото'}
            </button>
            {shownAvatar && (
              <button
                type="button"
                className={styles.avatarBtnDanger}
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = ''
                  setForm((f) => ({ ...f, avatar: null, clearAvatar: true }))
                }}
              >
                Прибрати
              </button>
            )}
          </div>
        </div>

        <div className={styles.detailsHead}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Нікнейм гравця"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            autoFocus
            placeholder="Нікнейм"
            editableStyle={titleTextStyle}
          />
        </div>
        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Роль гравця"
            value={form.role_note}
            onChange={(e) => setForm((f) => ({ ...f, role_note: e.target.value }))}
            multiline
            minRows={2}
            placeholder="Роль / опис…"
            editableStyle={roleTextStyle}
          />
        </div>

        <div className={styles.statusSeg} role="group" aria-label="Статус гравця">
          {Object.entries(playerStatus).map(([value, [color, label]]) => (
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
// чернетка нового гравця масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

// Згорнутий рядок гравця. Редагування відкриває модалку
// цього ж гравця одразу в режимі редагування.
function PlayerRow({ player: p, worldId, locations, accent, canEdit, onEdit, onDelete }) {
  const { open } = useExpandableCard()
  const status = p.status || 'alive'
  const [dot, label] = playerStatus[status] || playerStatus.alive
  const handleEdit = (e) => {
    e.stopPropagation()
    onEdit(p)
    open()
  }

  return (
    <div className={styles.playerRow}>
      <PlayerAvatar src={p.avatar} name={p.nickname} dead={status === 'dead'} />
      <div className={styles.playerInfo}>
        <div className={styles.playerName}>{p.nickname}</div>
        <div className={styles.playerRole}>{p.role_note || 'Немає ролі'}</div>
      </div>
      {status !== 'alive' && (
        <span className={styles.statusChip} style={{ background: `${dot}33`, color: dot }}>
          {label}
        </span>
      )}
      <div className={styles.rowActions}>
        <RelationshipButton
          worldId={worldId}
          sourceType="player"
          sourceId={p.id}
          name={p.nickname}
          accent={accent}
        />
        {canEdit && (
          <>
            <IconButton size="small" aria-label="Редагувати гравця" onClick={handleEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Видалити гравця"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(p)
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

function PlayerItemCard({
  player,
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
          <PlayerEditor
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={saving}
            isNew={false}
            currentAvatarUrl={player.avatar}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <PlayerDetails
            player={player}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            onEdit={() => onEdit(player)}
            onDelete={() => {
              onDelete(player)
              close()
            }}
          />
        )
      }
    >
      <PlayerRow
        player={player}
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

function NewPlayerCard({ worldId, accent, form, setForm, saving, onSave, onDiscard }) {
  const draftName = cleanName(form.nickname)

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <PlayerEditor
          worldId={worldId}
          accent={accent}
          form={form}
          setForm={setForm}
          saving={saving}
          isNew
          currentAvatarUrl={null}
          onSave={() => onSave(close)}
          onCancel={close}
        />
      )}
    >
      <AutoOpen />
      <div className={styles.playerRow}>
        <PlayerAvatar src={null} name={draftName} dead={false} />
        <div className={styles.playerInfo}>
          <div className={`${styles.playerName} ${draftName ? '' : styles.draftName}`}>
            {draftName || 'Новий гравець…'}
          </div>
        </div>
      </div>
    </ExpandableCard>
  )
}

export default function PlayersSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const section = useExpandableCard()
  const canEdit = userRole && userRole !== 'viewer'

  const { data: players = [] } = useQuery({
    queryKey: ['players', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/players/`).then((r) => r.data),
  })
  const { data: locations = [] } = useLocations(worldId)
  const visiblePlayers = players.filter((p) => {
    if (statusFilter && (p.status || 'alive') !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (section.full && q) {
      return `${p.nickname || ''} ${p.role_note || ''}`.toLowerCase().includes(q)
    }
    return true
  })

  const buildPayload = (f) => {
    const data = new FormData()
    data.append('nickname', cleanName(f.nickname))
    data.append('role_note', f.role_note || '')
    data.append('status', f.status || 'alive')
    if (f.avatar) data.append('avatar', f.avatar)
    else if (f.clearAvatar) data.append('avatar_clear', 'true')
    return data
  }

  const mutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? api.patch(`/worlds/${worldId}/players/${id}/`, payload)
        : api.post(`/worlds/${worldId}/players/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['players', String(worldId)])
      qc.invalidateQueries(['world', String(worldId)])
    },
  })

  const undo = useUndo()
  const deletePlayer = (p) =>
    undo.deleteItem({
      id: p.id,
      url: `/worlds/${worldId}/players/${p.id}/`,
      queryKeys: [
        ['players', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Гравця «${p.nickname}» видалено`,
      nouns: ['гравець', 'гравці', 'гравців'],
    })

  const openNew = () => {
    setEditingId(null)
    setForm(empty)
    setCreating(true)
  }
  const openEdit = (p) => {
    setCreating(false)
    setEditingId(p.id)
    setForm({
      nickname: p.nickname,
      role_note: p.role_note || '',
      status: p.status || 'alive',
      avatar: null,
      clearAvatar: false,
    })
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
    if (!cleanName(form.nickname) || mutation.isPending) return
    mutation.mutate(
      { id: editingId, payload: buildPayload(form) },
      { onSuccess: () => setEditingId(null) },
    )
  }
  // Створення закриває модалку — новий гравець лишається у списку.
  const saveCreate = (close) => {
    if (!cleanName(form.nickname) || mutation.isPending) return
    mutation.mutate({ id: null, payload: buildPayload(form) }, { onSuccess: () => close() })
  }

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Гравці ({players.length})</h3>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Додати
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
              placeholder="Знайти гравця…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук гравця"
            />
          </div>
          <div className={styles.statusChips} role="group" aria-label="Фільтр за статусом">
            {Object.entries(playerStatus).map(([value, [color, label]]) => (
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
        </>
      )}

      <div
        className={`${sharedStyles.body} ${styles.playerList} ${
          section.modal ? styles.playerListFull : ''
        } ${section.full ? styles.playerListWide : ''}`}
      >
        {canEdit && creating && (
          <NewPlayerCard
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onSave={saveCreate}
            onDiscard={discardCreate}
          />
        )}
        {visiblePlayers.map((p) => (
          <PlayerItemCard
            key={p.id}
            player={p}
            worldId={worldId}
            locations={locations}
            accent={accent}
            canEdit={canEdit}
            isEditing={editingId === p.id}
            form={form}
            setForm={setForm}
            saving={mutation.isPending}
            onEdit={openEdit}
            onSave={saveEdit}
            onCancelEdit={discardEdit}
            onDelete={deletePlayer}
            onDiscardEdit={discardEdit}
          />
        ))}
        {visiblePlayers.length === 0 && !creating && (
          <p className={sharedStyles.emptyMsg}>
            {players.length === 0
              ? 'Тут поки нікого немає. Додай першого гравця світу.'
              : 'Нічого не знайдено.'}
          </p>
        )}
      </div>
    </div>
  )
}
