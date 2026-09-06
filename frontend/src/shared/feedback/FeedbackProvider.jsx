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
  const timer = useRef(null)

  const notify = useCallback((message) => {
    if (timer.current) clearTimeout(timer.current)
    // Мікропауза, щоб однакове повідомлення підряд перемалювалось
    timer.current = setTimeout(() => {
      setSnack({ open: true, message, stamp: Date.now() })
    }, 30)
  }, [])

  const close = useCallback(() => setSnack((s) => ({ ...s, open: false })), [])

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
            },
          },
        }}
      />
    </FeedbackContext.Provider>
  )
}
