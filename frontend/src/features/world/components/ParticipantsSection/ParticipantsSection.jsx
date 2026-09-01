import { useState } from 'react'
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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import api from '../../../../api'
import UserAvatar from '../../../../shared/components/UserAvatar/UserAvatar'
import sharedStyles from '../shared/section.module.css'
import styles from './ParticipantsSection.module.css'

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Редактор', desc: 'Може додавати та змінювати дані' },
  { value: 'viewer', label: 'Глядач', desc: 'Лише перегляд' },
]

const ROLE_LABELS = {
  owner: 'Власник',
  editor: 'Редактор',
  viewer: 'Глядач',
}

const ROLE_CHIP_CLASS = {
  owner: styles.roleOwner,
  editor: styles.roleEditor,
  viewer: styles.roleViewer,
}

export default function ParticipantsSection({ worldId, accent, userRole, world }) {
  const qc = useQueryClient()
  const isOwner = userRole === 'owner'
  const isEditor = userRole === 'editor' || isOwner

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const { data: participants = [] } = useQuery({
    queryKey: ['memberships', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/memberships/`).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/memberships/${id}/`),
    onSuccess: () => qc.invalidateQueries(['memberships', String(worldId)]),
  })

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>
          Учасники ({participants.length + 1})
        </h3>
        {isEditor && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Додати
          </Button>
        )}
      </div>

      <div className={`${sharedStyles.body} ${styles.list}`}>
        <div className={`${styles.row} ${styles.ownerRow}`}>
          <UserAvatar username={world.owner_username} size="sm" />
          <div className={styles.info}>
            <div className={styles.name}>{world.owner_username}</div>
            <div className={`${styles.roleChip} ${styles.roleOwner}`}>Власник</div>
          </div>
        </div>
        {participants.map((p) => (
          <div key={p.id} className={styles.row}>
            <UserAvatar username={p.username} avatarUrl={p.avatar_url} size="sm" />
            <div className={styles.info}>
              <div className={styles.name}>{p.username}</div>
              <div className={`${styles.roleChip} ${ROLE_CHIP_CLASS[p.role] || ''}`}>
                {ROLE_LABELS[p.role] || p.role}
              </div>
            </div>
            {isOwner && (
              <div className={styles.actions}>
                <IconButton size="small" onClick={() => setEditTarget(p)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setRemoveTarget(p)}>
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </div>
            )}
          </div>
        ))}
        {participants.length === 0 && !isOwner && (
          <p className={sharedStyles.emptyMsg}>
            Поки немає інших учасників.
          </p>
        )}
      </div>

      <AddParticipantDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        worldId={worldId}
      />
      <EditRoleDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        participant={editTarget}
        worldId={worldId}
      />
      <RemoveParticipantDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        participant={removeTarget}
        worldId={worldId}
        onDelete={(id) => deleteMutation.mutateAsync(id).then(() => setRemoveTarget(null))}
      />
    </div>
  )
}

function AddParticipantDialog({ open, onClose, worldId }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('viewer')
  const [selected, setSelected] = useState(null)

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['participant-search', String(worldId), search],
    queryFn: () =>
      api.get(`/worlds/${worldId}/participants/search/`, { params: { q: search } }).then((r) => r.data),
    enabled: search.length >= 2,
    staleTime: 5000,
  })

  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post(`/worlds/${worldId}/memberships/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['memberships', String(worldId)])
      setSearch('')
      setRole('viewer')
      setSelected(null)
      onClose()
    },
  })

  const handleSelect = (user) => {
    setSelected(user)
    setSearch(user.username)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selected) return
    inviteMutation.mutate({ user: selected.id, role, status: 'active' })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Додати учасника</DialogTitle>
        <DialogContent>
          <div className={sharedStyles.formFields}>
            <TextField
              label="Пошук користувача"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelected(null)
              }}
              placeholder="Введіть ім'я користувача…"
              autoFocus
            />
            {search.length >= 2 && !selected && (
              <div className={styles.searchResults}>
                {isFetching && <p className={styles.searchHint}>Пошук…</p>}
                {!isFetching && results.length === 0 && (
                  <p className={styles.searchHint}>Нічого не знайдено</p>
                )}
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={styles.searchItem}
                    onClick={() => handleSelect(u)}
                  >
                    <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="xs" />
                    <span className={styles.searchName}>{u.username}</span>
                    {u.is_friend && <span className={styles.friendBadge}>Друг</span>}
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className={styles.selectedUser}>
                <UserAvatar username={selected.username} avatarUrl={selected.avatar_url} size="sm" />
                <span className={styles.selectedName}>{selected.username}</span>
                {selected.is_friend && <span className={styles.friendBadge}>Друг</span>}
              </div>
            )}
            <TextField
              select
              label="Роль"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label} — {o.desc}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </DialogContent>
        <DialogActions className={sharedStyles.dialogActions}>
          <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
            Скасувати
          </Button>
          <Button
            type="submit"
            className={sharedStyles.dialogBtnSubmit}
            disabled={!selected || inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Додаємо…' : 'Додати'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function EditRoleDialog({ open, onClose, participant, worldId }) {
  const qc = useQueryClient()
  const [role, setRole] = useState(participant?.role || 'viewer')

  const updateMutation = useMutation({
    mutationFn: (payload) => api.patch(`/worlds/${worldId}/memberships/${participant.id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['memberships', String(worldId)])
      onClose()
    },
  })

  if (!participant) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
    >
      <DialogTitle>Змінити роль</DialogTitle>
      <DialogContent>
        <div className={sharedStyles.formFields}>
          <div className={styles.selectedUser}>
            <UserAvatar username={participant.username} avatarUrl={participant.avatar_url} size="sm" />
            <span className={styles.selectedName}>{participant.username}</span>
          </div>
          <TextField
            select
            label="Нова роль"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label} — {o.desc}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </DialogContent>
      <DialogActions className={sharedStyles.dialogActions}>
        <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
          Скасувати
        </Button>
        <Button
          onClick={() => updateMutation.mutateAsync({ role })}
          className={sharedStyles.dialogBtnSubmit}
          disabled={updateMutation.isPending || role === participant.role}
        >
          {updateMutation.isPending ? 'Зберігаємо…' : 'Зберегти'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RemoveParticipantDialog({ open, onClose, participant, worldId, onDelete }) {
  if (!participant) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
    >
      <DialogTitle>Видалити учасника?</DialogTitle>
      <DialogContent>
        <p className={styles.removeText}>
          Ви впевнені, що хочете видалити <strong>{participant.username}</strong> зі світу?
          Цей користувач більше не матиме доступу до світу.
        </p>
      </DialogContent>
      <DialogActions className={sharedStyles.dialogActions}>
        <Button onClick={onClose} className={sharedStyles.dialogBtnCancel}>
          Скасувати
        </Button>
        <Button
          onClick={() => onDelete(participant.id)}
          className={sharedStyles.dialogBtnSubmit}
          sx={{ background: '#A63C39 !important' }}
        >
          Видалити
        </Button>
      </DialogActions>
    </Dialog>
  )
}
