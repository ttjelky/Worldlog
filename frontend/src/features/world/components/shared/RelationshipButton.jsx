import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import RelationshipList from './RelationshipList'
import sharedStyles from './section.module.css'
import styles from './RelationshipList.module.css'

// Кнопка «зв'язки» для рядка будь-якої секції: відкриває діалог,
// де можна переглянути та додати зв'язки елемента з іншими елементами світу.
export default function RelationshipButton({
  worldId,
  sourceType,
  sourceId,
  name,
  accent,
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title="Зв'язки">
        <IconButton
          size="small"
          aria-label="Зв'язки"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <LinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <DialogTitle className={styles.dialogTitle}>{name}</DialogTitle>
        <DialogContent>
          <RelationshipList
            worldId={worldId}
            sourceType={sourceType}
            sourceId={sourceId}
            accent={accent}
            variant="dialog"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}