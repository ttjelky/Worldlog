import Logo from '../Logo/Logo'
import styles from './AuthShell.module.css'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className={styles.root}>
      <div className={styles.paper}>
        <div className={styles.logoWrap}>
          <Logo />
        </div>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
