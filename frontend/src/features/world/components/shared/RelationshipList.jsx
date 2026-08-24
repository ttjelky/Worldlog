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
import LinkIcon from '@mui/icons-material/Link'
import api from '../../../../api'
import sharedStyles from './section.module.css'
import styles from './RelationshipList.module.css'

const targetTypeLabels = {
  location: 'Локація',
  wiki_page: 'Wiki-сторінка',
  project: 'Проєкт',
  todo: 'Завдання',
  event: 'Подія',
  note: 'Нотатка',
}

export default function RelationshipList({ worldId, sourceType, sourceId }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ target_type: 'wiki_page', target_id: '', label: '' })

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships', String(worldId), sourceType, String(sourceId)],
    queryFn: () =>
      api
        .get(`/worlds/${worldId}/relationships/`, {
          params: { source_type: sourceType, source_id: sourceId },
        })
        .then((r) => r.data),
  })

  const { data: reverseRelationships = [] } = useQuery({
    queryKey: ['relationships', String(worldId), 'reverse', sourceType, String(sourceId)],
    queryFn: () =>
      api
        .get(`/worlds/${worldId}/relationships/`, {
          params: { target_type: sourceType, target_id: sourceId },
        })
        .then((r) => r.data),
  })

  const allRelationships = [
    ...relationships.map((r) => ({ ...r, direction: 'outgoing' })),
    ...reverseRelationships.map((r) => ({ ...r, direction: 'incoming' })),
  ]

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(`/worlds/${worldId}/relationships/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['relationships', String(worldId)])
      setAddOpen(false)
      setForm({ target_type: 'wiki_page', target_id: '', label: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/relationships/${id}/`),
    onSuccess: () => qc.invalidateQueries(['relationships', String(worldId)]),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      source_type: sourceType,
      source_id: sourceId,
      target_type: form.target_type,
      target_id: Number(form.target_id),
      label: form.label,
    })
  }

  if (allRelationships.length === 0 && !addOpen) {
    return (
      <div className={styles.relationships}>
        <div className={styles.sectionLabel}>
          <LinkIcon fontSize="small" />
          <span>Пов'язані об'єкти</span>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            className={styles.addBtn}
          >
            Додати зв'язок
          </Button>
        </div>
        <p className={sharedStyles.emptyMsg}>Немає пов'язаних об'єктів</p>
      </div>
    )
  }

  return (
    <div className={styles.relationships}>
      <div className={styles.sectionLabel}>
        <LinkIcon fontSize="small" />
        <span>Пов'язані об'єкти ({allRelationships.length})</span>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          className={styles.addBtn}
        >
          Додати
        </Button>
      </div>
      <div className={styles.relList}>
        {allRelationships.map((rel) => (
          <div key={rel.id} className={styles.relItem}>
            <span className={styles.relDirection}>
              {rel.direction === 'outgoing' ? '→' : '←'}
            </span>
            <div className={styles.relInfo}>
              <span className={styles.relType}>
                {targetTypeLabels[rel.target_type] || rel.target_type}
              </span>
              <span className={styles.relName}>
                {rel.target_name || `#${rel.target_id}`}
              </span>
              {rel.label && <span className={styles.relLabel}>{rel.label}</span>}
            </div>
            <IconButton
              size="small"
              onClick={() => deleteMutation.mutate(rel.id)}
              className={styles.relDelete}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </div>
        ))}
      </div>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { className: sharedStyles.dialogPaper } }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>Додати зв'язок</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <TextField
                label="Тип об'єкта"
                select
                value={form.target_type}
                onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value }))}
              >
                {Object.entries(targetTypeLabels).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="ID об'єкта"
                type="number"
                value={form.target_id}
                onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}
                required
              />
              <TextField
                label="Позначка (необов'язково)"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setAddOpen(false)} className={sharedStyles.dialogBtnCancel}>
              Скасувати
            </Button>
            <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
              Додати
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
