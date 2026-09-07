import { Suspense, lazy } from 'react'
import sharedStyles from '../shared/section.module.css'
import { useExpandableCard } from '../shared/ExpandableCard'
import styles from './RelationshipsSection.module.css'

// d3-force важкий — вантажимо граф лише коли картка на екрані
const WikiGraph = lazy(() => import('../WikiSection/WikiGraph'))

// Подія «відкрити вікі-сторінку з графа»: слухає WikiSection (detail = id сторінки).
export const OPEN_WIKI_PAGE_EVENT = 'worldlog:open-wiki-page'

export function openWikiPage(id) {
  window.dispatchEvent(new CustomEvent(OPEN_WIKI_PAGE_EVENT, { detail: id }))
}

export default function RelationshipsSection({ worldId, accent }) {
  const section = useExpandableCard()

  return (
    <div className={sharedStyles.card} style={{ '--accent': accent }}>
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Зв&apos;язки</h3>
      </div>

      <div className={`${sharedStyles.body} ${section.modal ? styles.graphBodyFull : ''}`}>
        <Suspense fallback={<p className={sharedStyles.emptyMsg}>Завантаження графа…</p>}>
          <WikiGraph
            worldId={worldId}
            onOpen={openWikiPage}
            height={section.full ? 640 : section.modal ? 560 : 340}
          />
        </Suspense>
      </div>
    </div>
  )
}
