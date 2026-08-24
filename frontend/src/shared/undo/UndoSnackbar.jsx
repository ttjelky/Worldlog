import { Box, Button, Snackbar } from '@mui/material'
import { UNDO_DELAY_MS } from './constants'

/**
 * Тост «видалено» з кнопкою «Скасувати» і смужкою зворотного відліку.
 * Закриття тоста (таймаут, клік повз, Escape) = підтвердження видалення,
 * тому викликає onExpire (реальний DELETE на бекенді).
 *
 * seq змінюється при кожному новому видаленні — через key батько
 * перемонтує тост, і анімація смужки починається спочатку.
 */
export default function UndoSnackbar({ open, message, onUndo, onExpire, seq = 0 }) {
  return (
    <Snackbar
      key={seq}
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={(_e, reason) => {
        if (reason !== 'clickaway') onExpire()
      }}
      message={
        <span style={{ display: 'block', minWidth: 220 }}>
          {message}
          {/* Смужка часу, що залишився: стискається справа ліворуч */}
          <Box
            sx={{
              position: 'relative',
              height: 4,
              mt: 1,
              borderRadius: 999,
              overflow: 'hidden',
              bgcolor: 'rgba(255,255,255,0.22)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#ffffff',
                transformOrigin: 'left',
                animation: `undo-toast-countdown ${UNDO_DELAY_MS}ms linear forwards`,
                '@keyframes undo-toast-countdown': {
                  from: { transform: 'scaleX(1)' },
                  to: { transform: 'scaleX(0)' },
                },
              }}
            />
          </Box>
        </span>
      }
      action={
        <Button color="inherit" size="small" onClick={onUndo}>
          Скасувати
        </Button>
      }
      slotProps={{
        content: {
          sx: {
            background: '#2d2d2d',
            color: '#ffffff',
            borderRadius: '22px',
            fontWeight: 500,
            fontSize: 16,
            boxShadow: '0 8px 28px rgba(13, 13, 15, 0.35)',
          },
        },
      }}
    />
  )
}
