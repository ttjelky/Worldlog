import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WorldCard from '../../../shared/components/WorldCard/WorldCard'
import { pickFeaturedWorld } from '../worldStats'
import { AddCardButton } from './AddCardButton'
import styles from './HomeSections.module.css'

/**
 * «Мої світи» на Головній: максимум ОДИН світ — найновіший зі списку
 * (World.Meta ordering = ['-created_at']; окремого поняття active world
 * у платформі немає). Секція рендериться завжди, навіть при 0 світів.
 */
export function HomeWorldSection({ worlds, onOpenWorlds, onCreate }) {
  const featured = pickFeaturedWorld(worlds)

  return (
    <section className={styles.section} aria-label="Мої світи">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Мої світи</h2>
        {worlds.length > 1 && (
          <button type="button" className={styles.sectionLink} onClick={onOpenWorlds}>
            На вкладку «Мої світи»
            <ArrowForwardIcon fontSize="small" />
          </button>
        )}
      </div>
      {featured ? (
        <div className={styles.singleCard}>
          <WorldCard world={featured} index={0} tone="violet" />
        </div>
      ) : (
        <div className={styles.singleCard}>
          <p className={styles.emptyHint}>У тебе поки немає світів — створи перший.</p>
          <AddCardButton onClick={onCreate} />
        </div>
      )}
    </section>
  )
}
