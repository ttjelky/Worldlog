import WorldCard from '../../../shared/components/WorldCard/WorldCard'
import { pickFeaturedWorld } from '../worldStats'
import { AddCardButton } from './AddCardButton'
import styles from './HomeSections.module.css'

/**
 * «Мої світи» на Головній: максимум ОДИН світ — найновіший зі списку
 * (World.Meta ordering = ['-created_at']; окремого поняття active world
 * у платформі немає). Картка на всю ширину секції; CTA «Мої світи»
 * вбудовано в саму картку (тільки якщо світів більше одного).
 * Секція рендериться завжди, навіть при 0 світів.
 */
export function HomeWorldSection({ worlds, onOpenWorlds, onCreate }) {
  const featured = pickFeaturedWorld(worlds)
  const showCta = worlds.length > 1

  return (
    <section className={styles.section} aria-label="Мої світи">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Мої світи</h2>
      </div>
      {featured ? (
        <WorldCard
          world={featured}
          index={0}
          tone="violet"
          ctaLabel={showCta ? 'Мої світи' : null}
          onCta={showCta ? onOpenWorlds : null}
        />
      ) : (
        <div className={styles.singleCard}>
          <p className={styles.emptyHint}>У тебе поки немає світів — створи перший.</p>
          <AddCardButton onClick={onCreate} />
        </div>
      )}
    </section>
  )
}
