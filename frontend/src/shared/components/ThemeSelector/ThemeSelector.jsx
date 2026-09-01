import { WORLD_THEMES } from '../../../features/world/themes'
import styles from './ThemeSelector.module.css'

export default function ThemeSelector({ value, onChange, dark = false }) {
  return (
    <div className={dark ? `${styles.root} ${styles.dark}` : styles.root}>
      <span className={styles.legend}>
        <span className={styles.legendTitle}>Тема світу</span>
        <span className={styles.legendHint}>Кольорове оформлення дошки світу</span>
      </span>
      <div className={styles.options}>
        {Object.values(WORLD_THEMES).map((theme) => {
          const selected = value === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.option} ${selected ? styles.selected : ''}`}
              style={{ '--ts-selected': theme.accentRed }}
              onClick={() => onChange(theme.id)}
              aria-pressed={selected}
            >
              <span className={styles.swatches}>
                <span className={styles.swatch} style={{ background: theme.accentRed }} />
                <span className={styles.swatch} style={{ background: theme.accentGreen }} />
              </span>
              <span className={styles.optionBody}>
                <span className={styles.optionName}>{theme.name}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
