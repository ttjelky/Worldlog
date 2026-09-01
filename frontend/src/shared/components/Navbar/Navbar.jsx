import { useState } from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth'
import UserAvatar from '../UserAvatar/UserAvatar'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Головна' },
  { id: 'overview', label: 'Огляд' },
  { id: 'worlds', label: 'Мої світи' },
  { id: 'friends', label: 'Друзі' },
  { id: 'search', label: 'Пошук' },
]

function NavLinkButton({ item, activePage, onNavigate }) {
  return (
    <Button
      role="tab"
      aria-selected={activePage === item.id}
      className={`${styles.navLink} ${activePage === item.id ? styles.navLinkActive : ''}`}
      onClick={() => onNavigate(item.id)}
    >
      {item.label}
    </Button>
  )
}

export default function Navbar({ activePage, onNavigate, logoSrc = '/worldlog-logo-purple.png' }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleNav = (id) => {
    if (id === 'home') navigate('/app')
    else if (id === 'worlds') navigate('/app/worlds')
    else if (id === 'friends') navigate('/app/friends')
    else if (id === 'search') navigate('/app/search')
    else onNavigate(id)
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navGroup}>
        <img
          src={logoSrc}
          alt="WorldLog"
          className={styles.logoImg}
          onClick={() => onNavigate('home')}
        />

        <div className={styles.navLinks} role="tablist" aria-label="Розділи">
          {NAV_ITEMS.map((item) => (
            <NavLinkButton
              key={item.id}
              item={item}
              activePage={activePage}
              onNavigate={handleNav}
            />
          ))}
        </div>
      </div>

      <div className={styles.navRight}>
        <Button
          className={styles.profileButton}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchorEl)}
        >
          <UserAvatar user={user} size="xs" className={styles.navAvatar} />
          <span className={styles.profileName}>{user?.username}</span>
          <span className={styles.chevron}>
            <KeyboardArrowDownIcon fontSize="small" />
          </span>
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              navigate('/app/profile')
            }}
          >
            Профіль
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Налаштування</MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              navigate('/')
              logout()
            }}
          >
            Вийти
          </MenuItem>
        </Menu>
      </div>
    </nav>
  )
}
