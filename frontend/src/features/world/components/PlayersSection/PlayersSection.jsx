import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Card,
  CardContent,
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
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import styles from './PlayersSection.module.css'

export default function PlayersSection({ worldId }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nickname: '', role_note: '', avatar: null })

  const { data: players = [] } = useQuery({
    queryKey: ['players', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/players/`).then((r) => r.data),
  })
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/players/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/players/`, payload),
    onSuccess: () => qc.invalidateQueries(['players', String(worldId)]),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/players/${id}/`),
    onSuccess: () => qc.invalidateQueries(['players', String(worldId)]),
  })

  const openNew = () => {
    setEditing(null)
    setForm({ nickname: '', role_note: '', avatar: null })
    setOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ nickname: p.nickname, role_note: p.role_note, avatar: null })
    setOpen(true)
  }
  const submit = (e) => {
    e.preventDefault()
    const data = new FormData()
    data.append('nickname', form.nickname)
    data.append('role_note', form.role_note || '')
    if (form.avatar) data.append('avatar', form.avatar)
    mutation.mutateAsync(data).then(() => setOpen(false))
  }

  return (
    <div>
      <div className={sharedStyles.sectionHeader}>
        <h6 className={sharedStyles.sectionTitle}>Гравці ({players.length})</h6>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNew}
        >
          Додати гравця
        </Button>
      </div>
      <div className={styles.playerList}>
        {players.map((p) => (
          <Card key={p.id}>
            <CardContent className={styles.playerCard}>
              <Avatar src={p.avatar || undefined} className={styles.avatar}>
                {(p.nickname || '?')[0].toUpperCase()}
              </Avatar>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>{p.nickname}</div>
                <div className={styles.playerRole}>{p.role_note || 'Немає ролі'}</div>
              </div>
              <IconButton size="small" onClick={() => openEdit(p)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => remove.mutate(p.id)}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
        {players.length === 0 && (
          <p className={sharedStyles.emptyMsg}>
            Тут поки нікого немає. Додай першого гравця світу.
          </p>
        )}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Редагувати гравця' : 'Новий гравець'}</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <TextField
                label="Нікнейм"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                required
                autoFocus
              />
              <TextField
                label="Роль / опис"
                value={form.role_note}
                onChange={(e) => setForm((f) => ({ ...f, role_note: e.target.value }))}
              />
              <TextField
                label="Аватар (скін або фото)"
                type="file"
                InputLabelProps={{ shrink: true }}
                onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.files?.[0] || null }))}
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setOpen(false)} color="inherit">
              Скасувати
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Зберегти
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
