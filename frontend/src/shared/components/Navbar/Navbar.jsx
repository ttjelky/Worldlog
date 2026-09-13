import { useState, useEffect, useRef } from 'react'
import { Button, Menu, MenuItem, Badge } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SearchIcon from '@mui/icons-material/Search'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth'
import { useNotifications } from '../../notifications/NotificationProvider'
import UserAvatar from '../UserAvatar/UserAvatar'
import NotificationsPanel from '../NotificationsPanel/NotificationsPanel'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Головна' },
  { id: 'overview', label: 'Огляд' },
  { id: 'worlds', label: 'Мої світи' },
  { id: 'friends', label: 'Друзі' },
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
  const [panelOpen, setPanelOpen] = useState(false)
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  // Пошук у навбарі: іконка розгортається в інпут, запит живе в ?q=
  const onSearchPage = location.pathname === '/app/search'
  const [searchOpen, setSearchOpen] = useState(activePage === 'search')
  const [value, setValue] = useState(params.get('q') || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (activePage === 'search') setSearchOpen(true)
  }, [activePage])

  useEffect(() => {
    setValue(params.get('q') || '')
  }, [params])

  const commitSearch = (v) => {
    const t = v.trim()
    if (location.pathname !== '/app/search') {
      if (t) navigate(`/app/search?q=${encodeURIComponent(t)}`)
    } else if ((params.get('q') || '') !== t) {
      setParams(t ? { q: t } : {}, { replace: true })
    }
  }

  useEffect(() => {
    if (!searchOpen) return
    const timer = setTimeout(() => commitSearch(value), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, searchOpen])

  const openSearch = () => {
    if (onSearchPage) {
      inputRef.current?.focus()
      return
    }
    setSearchOpen(true)
    navigate('/app/search')
  }

  const handleNav = (id) => {
    if (id === 'home') navigate('/app')
    else if (id === 'worlds') navigate('/app/worlds')
    else if (id === 'friends') navigate('/app/friends')
    else if (id === 'search') navigate('/app/search')
    else onNavigate(id)
  }

  return (
    <nav className={`${styles.navbar} ${searchOpen ? styles.searching : ''}`}>
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
          <div className={`${styles.searchWrap} ${searchOpen ? styles.open : ''}`}>
            <button
              type="button"
              aria-label="Пошук"
              className={styles.magBtn}
              onClick={() => {
                if (searchOpen) inputRef.current?.focus()
                else openSearch()
              }}
            >
              <SearchIcon />
            </button>
            <input
              ref={inputRef}
              autoFocus={searchOpen}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setValue('')
                  commitSearch('')
                }
              }}
              onBlur={() => {
                if (!value && location.pathname !== '/app/search') setSearchOpen(false)
              }}
              placeholder="Пошук…"
              aria-label="Пошук"
              tabIndex={searchOpen ? 0 : -1}
              className={styles.searchField}
            />
          </div>
        </div>
      </div>

      <div className={styles.navRight}>
        <Button
          className={styles.notificationsBtn}
          onClick={() => setPanelOpen(true)}
          aria-label="Сповіщення"
          aria-haspopup="dialog"
        >
          <Badge badgeContent={unreadCount} color="error" max={9}>
            <NotificationsIcon />
          </Badge>
        </Button>
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
            onClick={async () => {
              setAnchorEl(null)
              await logout()
              navigate('/')
            }}
          >
            Вийти
          </MenuItem>
        </Menu>
      </div>
      {panelOpen && <NotificationsPanel onClose={() => setPanelOpen(false)} />}
    </nav>
  )
}
