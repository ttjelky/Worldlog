import { getCompletionPercent } from '../../shared/components/WorldCard/WorldCard'

/** Чиста агрегація лічильників WorldSerializer: ті самі числа для Огляду і Головної. */
export function summarizeWorlds(worlds) {
  const list = Array.isArray(worlds) ? worlds : []
  const total = list.length
  const done = list.reduce((s, w) => s + (w.todos_done || 0), 0)
  const all = list.reduce((s, w) => s + (w.todos_count || 0), 0)
  return {
    total,
    locations: list.reduce((s, w) => s + (w.locations_count || 0), 0),
    pub: list.filter((w) => w.is_public).length,
    done,
    all,
    avg: total
      ? Math.round(list.reduce((s, w) => s + getCompletionPercent(w), 0) / total)
      : 0,
  }
}

/**
 * Один світ для Головної: перший зі списку. World.Meta ordering =
 * ['-created_at'], тож це найновіший — стабільно і детерміновано.
 * Окремого поняття active/last-opened world у платформі немає.
 */
export function pickFeaturedWorld(worlds) {
  return Array.isArray(worlds) && worlds.length > 0 ? worlds[0] : null
}
