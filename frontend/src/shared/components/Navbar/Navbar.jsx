import { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth'
import Logo from '../Logo/Logo'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Головна' },
  { id: 'overview', label: 'Огляд' },
  { id: 'worlds', label: 'Мої світи' },
  { id: 'friends', label: 'Друзі' },
  { id: 'search', label: 'Пошук' },
]

export default function Navbar({ activePage, onNavigate }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className={styles.navbar}>
      <div className={styles.navGroup}>
        <Logo onClick={() => onNavigate('home')} variant="dark" />

        <div className={styles.navLinks} role="tablist" aria-label="Розділи">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activePage === item.id}
              className={`${styles.navLink} ${activePage === item.id ? styles.navLinkActive : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.navRight}>
        <button
          className={styles.profileButton}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchorEl)}
        >
          <span className={styles.avatar}>{(user?.username || '?')[0].toUpperCase()}</span>
          <span className={styles.profileName}>{user?.username}</span>
          <span className={styles.chevron}>
            <KeyboardArrowDownIcon fontSize="small" />
          </span>
        </button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => setAnchorEl(null)}>Профіль</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Налаштування</MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              logout()
              navigate('/')
            }}
          >
            Вийти
          </MenuItem>
        </Menu>
      </div>
    </nav>
  )
}
