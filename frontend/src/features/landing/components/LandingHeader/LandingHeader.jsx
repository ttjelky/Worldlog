import { Button } from '@mui/material'
import Logo from '../../../../shared/components/Logo/Logo'
import styles from './LandingHeader.module.css'

const navLinks = ['Головна', 'Про проєкт', 'GitHub']

function NavLinkButton({ link }) {
  return (
    <Button className={styles.navLink}>
      {link}
    </Button>
  )
}

export default function LandingHeader({ onStart }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <NavLinkButton key={link} link={link} />
          ))}
        </nav>
        <Button variant="contained" color="primary" onClick={onStart}>
          Створити паспорт світу
        </Button>
      </div>
    </header>
  )
}
