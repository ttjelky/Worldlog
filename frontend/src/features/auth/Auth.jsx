import { useState } from 'react'
import { Button, TextField, Alert } from '@mui/material'
import AuthShell from '../../shared/components/AuthShell/AuthShell'
import { useAuth } from '../../auth'
import styles from './Auth.module.css'

export function Login({ onNavigate }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      onNavigate('/app')
    } catch {
      setError('Невірне ім\u2019я користувача або пароль')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="З поверненням"
      subtitle="Увійди, щоб керувати своїми світами"
      footer={
        <span>
          Немає акаунта?{' '}
          <button className={styles.footerLink} onClick={() => onNavigate('/register')}>
            Зареєструватись
          </button>
        </span>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Ім'я користувача"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
          {loading ? 'Вхід...' : 'Увійти'}
        </Button>
      </form>
    </AuthShell>
  )
}

export function Register({ onNavigate }) {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(username, email, password)
      onNavigate('/app')
    } catch (err) {
      const detail = err.response?.data
      const msg =
        detail?.username?.[0] || detail?.email?.[0] || detail?.detail || 'Щось пішло не так'
      setError(String(msg))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Створити акаунт"
      subtitle="Твій світ заслуговує на власний паспорт"
      footer={
        <span>
          Вже є акаунт?{' '}
          <button className={styles.footerLink} onClick={() => onNavigate('/login')}>
            Увійти
          </button>
        </span>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Ім'я користувача"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
          {loading ? 'Створення...' : 'Зареєструватись'}
        </Button>
      </form>
    </AuthShell>
  )
}
