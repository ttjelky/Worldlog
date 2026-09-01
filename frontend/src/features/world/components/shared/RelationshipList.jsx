import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
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
import LinkIcon from '@mui/icons-material/Link'
import api from '../../../../api'
import sharedStyles from './section.module.css'
import styles from './RelationshipList.module.css'

export const entityTypeLabels = {
  player: 'Гравець',
  location: 'Локація',
  wiki_page: 'Wiki-сторінка',
  project: 'Проєкт',
  todo: 'Завдання',
  event: 'Подія',
  note: 'Нотатка',
  bookmark: 'Закладка',
  idea: 'Ідея',
}

// variant="card"  — на кольоровій картці (білий текст),
// variant="dialog" — у світлому діалозі (темний текст).
export default function RelationshipList({ worldId, sourceType, sourceId, accent, variant = 'card' }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [label, setLabel] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const key = [String(worldId), sourceType, String(sourceId)]
  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships', ...key],
    queryFn: () =>
      api
        .get(`/worlds/${worldId}/relationships/`, {
          params: { source_type: sourceType, source_id: sourceId },
        })
        .then((r) => r.data),
  })

  const { data: reverseRelationships = [] } = useQuery({
    queryKey: ['relationships', 'reverse', ...key],
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

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: entities = [] } = useQuery({
    queryKey: ['world-entities', String(worldId), search],
    queryFn: () =>
      api
        .get(`/worlds/${worldId}/entities/`, {
          params: {
            q: search || undefined,
            exclude_type: sourceType,
            exclude_id: sourceId,
            limit: 100,
          },
        })
        .then((r) => r.data),
    enabled: addOpen,
  })

  const linkedKeys = new Set(
    allRelationships.map((r) =>
      r.direction === 'outgoing'
        ? `${r.target_type}:${r.target_id}`
        : `${r.source_type}:${r.source_id}`,
    ),
  )
  const availableEntities = entities.filter((e) => !linkedKeys.has(`${e.type}:${e.id}`))

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(`/worlds/${worldId}/relationships/`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['relationships', String(worldId)])
      setAddOpen(false)
      setSelected(null)
      setLabel('')
      setSearch('')
      setSearchInput('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/worlds/${worldId}/relationships/${id}/`),
    onSuccess: () => qc.invalidateQueries(['relationships', String(worldId)]),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selected) return
    createMutation.mutate({
      source_type: sourceType,
      source_id: sourceId,
      target_type: selected.type,
      target_id: selected.id,
      label,
    })
  }

  const rows = allRelationships.map((r) => ({
    id: r.id,
    direction: r.direction,
    type: r.direction === 'outgoing' ? r.target_type : r.source_type,
    idOfOther: r.direction === 'outgoing' ? r.target_id : r.source_id,
    name: r.direction === 'outgoing' ? r.target_name : r.source_name,
    label: r.label,
  }))

  const variantClass = variant === 'dialog' ? styles.dialogVariant : styles.cardVariant

  return (
    <div className={`${styles.relationships} ${variantClass}`}>
      <div className={styles.sectionLabel}>
        <LinkIcon fontSize="small" />
        <span>Пов'язані об'єкти ({rows.length})</span>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          className={styles.addBtn}
        >
          Додати зв'язок
        </Button>
      </div>

      {rows.length === 0 && (
        <p className={sharedStyles.emptyMsg}>Немає пов'язаних об'єктів</p>
      )}

      <div className={styles.relList}>
        {rows.map((rel) => (
          <div key={rel.id} className={styles.relItem}>
            <span className={styles.relDirection}>
              {rel.direction === 'outgoing' ? '→' : '←'}
            </span>
            <div className={styles.relInfo}>
              <span className={styles.relType}>
                {entityTypeLabels[rel.type] || rel.type}
              </span>
              <span className={styles.relName}>{rel.name || `#${rel.idOfOther}`}</span>
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
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle className={styles.dialogTitle}>Додати зв'язок</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <Autocomplete
                options={availableEntities}
                groupBy={(option) => entityTypeLabels[option.type] || option.type}
                getOptionLabel={(option) => option.name || ''}
                isOptionEqualToValue={(o, v) => o.type === v?.type && o.id === v?.id}
                filterOptions={(x) => x}
                value={selected}
                onChange={(_, val) => setSelected(val)}
                onInputChange={(_, val) => setSearchInput(val)}
                renderOption={(props, option) => (
                  <li {...props} key={`${option.type}-${option.id}`}>
                    <span className={styles.optType}>
                      {entityTypeLabels[option.type] || option.type}
                    </span>
                    <span className={styles.optName}>{option.name}</span>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Обрати елемент"
                    required
                    placeholder="Почни вводити назву…"
                  />
                )}
              />
              <TextField
                label="Позначка (необов'язково)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="наприклад: батько, ворог, мешкає в"
              />
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setAddOpen(false)} className={sharedStyles.dialogBtnCancel}>
              Скасувати
            </Button>
            <Button
              type="submit"
              className={sharedStyles.dialogBtnSubmit}
              disabled={!selected}
            >
              Додати
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}