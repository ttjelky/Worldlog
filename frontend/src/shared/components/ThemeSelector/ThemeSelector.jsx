import CheckIcon from '@mui/icons-material/Check'
import { WORLD_THEMES } from '../../../features/world/themes'
import styles from './ThemeSelector.module.css'

export default function ThemeSelector({ value, onChange, dark = false }) {
  return (
    <div className={dark ? `${styles.root} ${styles.dark}` : styles.root}>
      <p className={styles.legendHint}>Кольорове оформлення дошки світу</p>
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
              <span
                className={styles.preview}
                style={{ background: theme.pageBg }}
                aria-hidden="true"
              >
                <span
                  className={styles.previewCard}
                  style={{ background: theme.accentRed }}
                />
                <span
                  className={styles.previewCard}
                  style={{ background: theme.accentGreen }}
                />
              </span>
              <span className={styles.optionBody}>
                <span className={styles.optionName}>{theme.name}</span>
              </span>
              {selected && (
                <span className={styles.check}>
                  <CheckIcon sx={{ fontSize: 16 }} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
