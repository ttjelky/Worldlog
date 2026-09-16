import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined'
import api from '../../../api'
import { useAuth } from '../../../auth'
import { useFeedback } from '../../../shared/feedback/FeedbackProvider'
import styles from './ProfileAccount.module.css'

/**
 * Керування акаунтом на своєму профілі: зміна пароля та видалення акаунта.
 */
export default function ProfileAccount({ username }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { notify } = useFeedback()
  const [passOpen, setPassOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [passError, setPassError] = useState('')
  const [delPassword, setDelPassword] = useState('')
  const [delConfirm, setDelConfirm] = useState('')
  const [delError, setDelError] = useState('')

  const closePass = () => {
    setPassOpen(false)
    setCurrent('')
    setNext('')
    setRepeat('')
    setPassError('')
  }

  const closeDel = () => {
    setDelOpen(false)
    setDelPassword('')
    setDelConfirm('')
    setDelError('')
  }

  const changePassword = useMutation({
    mutationFn: (payload) => api.post('/me/password/', payload),
    onSuccess: () => {
      closePass()
      notify('Пароль змінено')
    },
    onError: (err) => {
      const data = err.response?.data || {}
      setPassError(
        data.current_password?.[0] || data.new_password?.[0] || 'Не вдалося змінити пароль',
      )
    },
  })

  const deleteAccount = useMutation({
    mutationFn: (payload) => api.post('/me/delete/', payload),
    onSuccess: async () => {
      closeDel()
      await logout()
      navigate('/', { replace: true })
      notify('Акаунт видалено')
    },
    onError: (err) => {
      const data = err.response?.data || {}
      setDelError(
        data.current_password?.[0] || data.confirm?.[0] || 'Не вдалося видалити акаунт',
      )
    },
  })

  const submitPass = (e) => {
    e.preventDefault()
    if (next !== repeat) {
      setPassError('Паролі не збігаються')
      return
    }
    changePassword.mutate({ current_password: current, new_password: next })
  }

  const submitDel = (e) => {
    e.preventDefault()
    deleteAccount.mutate({ current_password: delPassword, confirm: delConfirm })
  }

  return (
    <section className={styles.card} aria-label="Безпека акаунта">
      <h3 className={styles.title}>Безпека</h3>
      <div className={styles.row}>
        <button type="button" className={styles.action} onClick={() => setPassOpen(true)}>
          <LockOutlinedIcon fontSize="small" />
          Змінити пароль
        </button>
        <button type="button" className={`${styles.action} ${styles.danger}`} onClick={() => setDelOpen(true)}>
          <DeleteForeverOutlinedIcon fontSize="small" />
          Видалити акаунт
        </button>
      </div>

      <Dialog open={passOpen} onClose={closePass} maxWidth="xs" fullWidth>
        <form onSubmit={submitPass}>
          <DialogTitle>Змінити пароль</DialogTitle>
          <DialogContent>
            <div className={styles.fields}>
              {passError && <p className={styles.error} role="alert">{passError}</p>}
              <TextField
                label="Поточний пароль"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Новий пароль"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                fullWidth
                inputProps={{ minLength: 8 }}
                helperText="Мінімум 8 символів"
              />
              <TextField
                label="Повторіть новий пароль"
                type="password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                required
                fullWidth
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={closePass}>Скасувати</Button>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={delOpen} onClose={closeDel} maxWidth="xs" fullWidth>
        <form onSubmit={submitDel}>
          <DialogTitle>Видалити акаунт?</DialogTitle>
          <DialogContent>
            <div className={styles.fields}>
              <p className={styles.warning}>
                Це безповоротно видалить акаунт, дружби та всі створені світи.
                Для підтвердження введіть пароль і своє імʼя ({username}).
              </p>
              {delError && <p className={styles.error} role="alert">{delError}</p>}
              <TextField
                label="Поточний пароль"
                type="password"
                value={delPassword}
                onChange={(e) => setDelPassword(e.target.value)}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Імʼя користувача"
                value={delConfirm}
                onChange={(e) => setDelConfirm(e.target.value)}
                required
                fullWidth
                placeholder={username}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDel}>Скасувати</Button>
            <Button type="submit" color="error" disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Видаляємо…' : 'Видалити назавжди'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  )
}
