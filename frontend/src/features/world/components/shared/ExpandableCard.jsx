import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import styles from './ExpandableCard.module.css'

// Дозволяє вкладеному контенту знати стан розгортання та відкрити модалку
export const ExpandableCardContext = createContext({ expanded: false, open: () => {} })

/**
 * Обгортка з анімацією розгортання картки на весь екран.
 *
 * Додаткові пропси (зворотно сумісні — секції світу працюють як раніше):
 * - clickOpens      — вся картка клікабельна (відкриває розгорнутий вигляд)
 * - showExpandBtn   — ховати/показувати круглу кнопку-іконку в кутку
 * - expandedContent — контент модалки; якщо функція, викликається як
 *                     expandedContent({ close }), де close закриває модалку
 * - wide            — ширша розгорнута модалка (для секції локацій)
 */
export default function ExpandableCard({
  children,
  className = '',
  clickOpens = false,
  showExpandBtn = true,
  expandedContent = null,
  wide = false,
}) {
  const cardRef = useRef(null)
  const modalRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  // Друга (коротка) фаза закриття: стартує лише ПІСЛЯ того, як анімація
  // стиснення (closing) повністю завершилась і картка вже стоїть на своєму
  // фінальному місці нерухомо. Лише тоді відбувається швидкий crossfade
  // між детальним контентом модалки та справжньою маленькою карткою —
  // так рух і розчинення ніколи не накладаються одне на одне.
  const [fading, setFading] = useState(false)
  const [rect, setRect] = useState(null)
  const prevFocusRef = useRef(null)

  const open = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    prevFocusRef.current = document.activeElement
    setRect(el.getBoundingClientRect())
    setClosing(false)
    setFading(false)
    setExpanded(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    setFading(false)
    document.body.style.overflow = ''
  }, [])

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) close()
  }

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded, close])

  const onModalAnimEnd = (e) => {
    // Кінець CSS-анімації (стиснення форми) — фаза 1 завершена, картка вже
    // нерухомо стоїть на фінальному місці. Тепер вмикаємо короткий фейд.
    if (e.target !== modalRef.current) return
    if (closing && !fading) setFading(true)
  }

  const onModalTransitionEnd = (e) => {
    // Кінець CSS-переходу opacity (фаза 2, короткий crossfade) — можна
    // прибирати portal.
    if (e.target !== modalRef.current || e.propertyName !== 'opacity') return
    if (fading) {
      setExpanded(false)
      setClosing(false)
      setFading(false)
      setRect(null)
      prevFocusRef.current?.focus()
    }
  }

  // Прихована копія (wrapper) і копія в модалці отримують різний контекст:
  // modal=true означає «це справжній розгорнутий вигляд»
  const collapsedCtx = useMemo(() => ({ expanded, open, modal: false }), [expanded, open])
  const modalCtx = useMemo(() => ({ expanded: true, open, modal: true }), [open])

  return (
    <>
      <ExpandableCardContext.Provider value={collapsedCtx}>
        <div
          ref={cardRef}
          className={`${styles.wrapper} ${
            fading ? styles.isClosing : expanded ? styles.isExpanded : ''
          } ${className}`}
          onClick={clickOpens ? open : undefined}
          style={clickOpens ? { cursor: 'pointer' } : undefined}
        >
          {children}
          {showExpandBtn && (
            <button
              className={styles.expandBtn}
              onClick={(e) => {
                e.stopPropagation()
                open()
              }}
              aria-label="Розгорнути картку"
              tabIndex={-1}
            >
              <OpenInFullIcon fontSize="small" />
            </button>
          )}
        </div>
      </ExpandableCardContext.Provider>

      {expanded &&
        rect &&
        createPortal(
          <ExpandableCardContext.Provider value={modalCtx}>
            <div
              className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`}
              onClick={onBackdropClick}
              role="dialog"
              aria-modal="true"
            >
              <div
                ref={modalRef}
                tabIndex={-1}
                className={`${styles.modal} ${wide ? styles.modalWide : ''} ${
                  closing ? styles.modalClosing : ''
                } ${fading ? styles.modalFadingOut : ''}`}
                style={{
                  '--origin-x': `${rect.left}px`,
                  '--origin-y': `${rect.top}px`,
                  '--origin-w': `${rect.width}px`,
                  '--origin-h': `${rect.height}px`,
                }}
                onAnimationEnd={onModalAnimEnd}
                onTransitionEnd={onModalTransitionEnd}
              >
                <div className={styles.modalContent}>
                  {typeof expandedContent === 'function'
                    ? expandedContent({ close })
                    : (expandedContent ?? children)}
                </div>
              </div>
            </div>
          </ExpandableCardContext.Provider>,
          document.body,
        )}
    </>
  )
}

export function useExpandableCard() {
  return useContext(ExpandableCardContext)
}
