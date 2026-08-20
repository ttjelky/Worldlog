import { Button } from '@mui/material'
import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingHeader.module.css'

const navLinks = ['Головна', 'Про проєкт', 'GitHub']

export default function LandingHeader({ onStart }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <button key={link} className={styles.navLink}>
              {link}
            </button>
          ))}
        </nav>
        <Button variant="contained" color="primary" onClick={onStart}>
          Створити паспорт світу
        </Button>
      </div>
    </header>
  )
}
