import { useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Link, Alert } from '@mui/material'
import Logo from '../components/Logo'
import { useAuth } from '../auth'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#F7F7FF" p={2}>
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, width: '100%', maxWidth: 440, boxShadow: '0 10px 40px rgba(13,13,15,.08)' }}>
        <Box mb={4}>
          <Logo />
        </Box>
        <Typography variant="h4" mb={0.5}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>{subtitle}</Typography>
        {children}
        {footer && <Box mt={3} textAlign="center">{footer}</Box>}
      </Paper>
    </Box>
  )
}

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
        <Typography variant="body2" color="text.secondary">
          Немає акаунта?{' '}
          <Link component="button" onClick={() => onNavigate('/register')} sx={{ fontWeight: 700 }}>
            Зареєструватись
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={submit} display="flex" flexDirection="column" gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Ім'я користувача" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <TextField label="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
          {loading ? 'Вхід...' : 'Увійти'}
        </Button>
      </Box>
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
        detail?.username?.[0] ||
        detail?.email?.[0] ||
        detail?.detail ||
        'Щось пішло не так'
      setError(String(msg))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Створити акаунт"
      subtitle="Твій світ заслуговує на власний паспорт"
      footer={
        <Typography variant="body2" color="text.secondary">
          Вже є акаунт?{' '}
          <Link component="button" onClick={() => onNavigate('/login')} sx={{ fontWeight: 700 }}>
            Увійти
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={submit} display="flex" flexDirection="column" gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Ім'я користувача" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
          {loading ? 'Створення...' : 'Зареєструватись'}
        </Button>
      </Box>
    </AuthShell>
  )
}