import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Snackbar } from '@mui/material'

const FeedbackContext = createContext({ notify: () => {} })

export const useFeedback = () => useContext(FeedbackContext)

/**
 * Єдиний канал фідбеку про дії (був дубльований Snackbar у 4 сторінках).
 * Використання: const { notify } = useFeedback(); notify('Збережено').
 * Вхідні сповіщення з сервера лишаються за ToastNotification.
 */
export default function FeedbackProvider({ children }) {
  const [snack, setSnack] = useState({ open: false, message: '', stamp: 0 })
  const queueRef = useRef([])
  const timer = useRef(null)

  const showNext = useCallback(() => {
    const next = queueRef.current.shift()
    if (!next) return
    setSnack({ open: true, message: next, stamp: Date.now() })
  }, [])

  const notify = useCallback((message) => {
    if (!message) return
    queueRef.current.push(message)
    // Якщо тост вже відкритий — дочекаємось закриття, інакше показуємо одразу.
    setSnack((s) => {
      if (s.open) return s
      const next = queueRef.current.shift()
      return next ? { open: true, message: next, stamp: Date.now() } : s
    })
  }, [])

  const close = useCallback(() => {
    setSnack((s) => ({ ...s, open: false }))
    if (timer.current) clearTimeout(timer.current)
    // Невелика пауза між тостами, щоб однакові підряд перемалювались.
    timer.current = setTimeout(showNext, 150)
  }, [showNext])

  return (
    <FeedbackContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        key={snack.stamp}
        open={snack.open}
        autoHideDuration={3000}
        onClose={close}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          content: {
            sx: {
              background: '#2d2d2d',
              color: '#ffffff',
              borderRadius: '22px',
              fontWeight: 500,
              fontSize: 15,
              boxShadow: '0 8px 28px rgba(13, 13, 15, 0.35)',
              // Розмір за контентом: без фіксованого мінімуму MUI (288px),
              // ширина росте з текстом до ліміту екрана
              width: 'auto',
              minWidth: 0,
              maxWidth: 'min(92vw, 520px)',
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
              justifyContent: 'center',
              '& .MuiSnackbarContent-message': {
                width: '100%',
                textAlign: 'center',
                paddingLeft: 0,
                paddingRight: 0,
              },
            },
          },
        }}
      />
    </FeedbackContext.Provider>
  )
}
