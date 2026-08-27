import { useMemo } from 'react'
import { categoryLabel, useLocations } from './locationData'
import { useLocationViewer } from './LocationViewer'
import styles from './LocationBadgeText.module.css'

/**
 * Рендерить вільний текст (todo, нотатки, планер тощо), перетворюючи назви
 * локацій світу на клікабельні бейджі. Клік по бейджу відкриває локацію
 * на весь екран.
 *
 * props:
 *  - text: рядок зі збереженого поля
 *  - worldId: світ (для отримання локацій, якщо не передано locations)
 *  - locations: готовий список локацій (необов'язково, економить запит)
 */
export default function LocationBadgeText({ text, worldId, locations: locationsProp, className }) {
  const { data: fetchedLocations = [] } = useLocations(worldId)
  const locations = locationsProp ?? fetchedLocations
  const { openLocation } = useLocationViewer()

  const segments = useMemo(() => {
    if (!text) return null
    const locList = locations.filter((l) => l.name)
    if (locList.length === 0) return [{ type: 'text', value: text }]

    // Сортуємо за спаданням довжини назви, щоб «ферма жителів» збігалась
    // раніше за коротше «ферма».
    const sorted = [...locList].sort((a, b) => b.name.length - a.name.length)
    const escaped = sorted.map((l) => l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const re = new RegExp(`(${escaped.join('|')})`, 'gi')

    const out = []
    let lastIndex = 0
    let m
    while ((m = re.exec(text)) !== null) {
      const matched = m[0]
      const found = sorted.find((l) => l.name.toLowerCase() === matched.toLowerCase())
      if (m.index > lastIndex) out.push({ type: 'text', value: text.slice(lastIndex, m.index) })
      out.push({ type: 'loc', value: matched, location: found })
      lastIndex = m.index + matched.length
      // Захист від нескінченного циклу на порожніх збігах
      if (m.index === re.lastIndex) re.lastIndex++
    }
    if (lastIndex < text.length) out.push({ type: 'text', value: text.slice(lastIndex) })
    return out
  }, [text, locations])

  if (!segments) return null
  if (!segments.some((s) => s.type === 'loc')) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={`${styles.root} ${className || ''}`}>
      {segments.map((seg, i) =>
        seg.type === 'loc' ? (
          <button
            key={i}
            type="button"
            className={styles.badge}
            title={`Відкрити локацію «${seg.value}» (${categoryLabel(seg.location?.category)})`}
            onClick={(e) => {
              e.stopPropagation()
              if (seg.location) openLocation(seg.location)
            }}
          >
            {seg.value}
          </button>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </span>
  )
}
