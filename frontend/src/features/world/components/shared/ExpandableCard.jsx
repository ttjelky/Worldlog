import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import styles from './ExpandableCard.module.css'

// Лічильник відкритих модалок: закриття вкладеної не має розблоковувати
// скрол, поки зовнішня ще відкрита.
let openModalCount = 0
function lockBody() {
  openModalCount += 1
  document.body.style.overflow = 'hidden'
}
function unlockBody() {
  openModalCount = Math.max(0, openModalCount - 1)
  if (openModalCount === 0) document.body.style.overflow = ''
}

// Дозволяє вкладеному контенту знати стан розгортання та відкрити модалку
export const ExpandableCardContext = createContext({
  expanded: false,
  open: () => {},
  modal: false,
  full: false,
})

/**
 * Обгортка з анімацією розгортання картки на весь екран.
 *
 * Додаткові пропси (зворотно сумісні — секції світу працюють як раніше):
 * - clickOpens      — вся картка клікабельна (відкриває розгорнутий вигляд)
 * - showExpandBtn   — ховати/показувати круглу кнопку-іконку в кутку
 * - expandedContent — контент модалки; якщо функція, викликається як
 *                     expandedContent({ close }), де close закриває модалку
 * - wide            — ширша розгорнута модалка (для секції локацій)
 * - extraWide       — ще просторіша модалка (для секції вікі)
 * - onClose           — необов'язковий колбек, викликається коли модалка
 *                     повністю закрилась (після анімації). Зручно, щоб
 *                     скинути стан редагування/чернетки всередині.
 */
export default function ExpandableCard({
  children,
  className = '',
  clickOpens = false,
  showExpandBtn = true,
  expandedContent = null,
  wide = false,
  extraWide = false,
  // Додатковий клас на вікно модалки (напр. автопідгін розміру під контент).
  // Необов'язковий, на решту карток не впливає.
  modalClassName = '',
  // Миттєве відкриття/закриття без фаз анімації (переглядачі фото тощо).
  instant = false,
  // Викликається один раз при переході expanded: true -> false
  // (після завершення анімації закриття).
  onClose = null,
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
  // Режим «на весь екран»: full — цільовий стан, fullAnim — активна
  // анімація переходу ('in' | 'out' | null)
  const [full, setFull] = useState(false)
  const [fullAnim, setFullAnim] = useState(null)
  const fullTimer = useRef(null)
  // Страховка закриття: якщо кастомний клас модалки (modalClassName)
  // перебиває анімацію стиснення, її animationend не прийде — тоді
  // йдемо у фазу фейду таймером. Нормальний шлях встигає раніше.
  const closeTimer = useRef(null)
  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const open = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    prevFocusRef.current = document.activeElement
    setRect(el.getBoundingClientRect())
    setClosing(false)
    setFading(false)
    setFull(false)
    setFullAnim(null)
    if (fullTimer.current) clearTimeout(fullTimer.current)
    clearCloseTimer()
    setExpanded(true)
    lockBody()
  }, [clearCloseTimer])

  const close = useCallback(() => {
    unlockBody()
    if (instant) {
      clearCloseTimer()
      if (fullTimer.current) clearTimeout(fullTimer.current)
      setClosing(false)
      setFading(false)
      setFull(false)
      setFullAnim(null)
      setExpanded(false)
      return
    }
    setClosing(true)
    setFading(false)
    setFull(false)
    setFullAnim(null)
    if (fullTimer.current) clearTimeout(fullTimer.current)
    clearCloseTimer()
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setFading(true)
    }, 400)
  }, [clearCloseTimer, instant])

  const toggleFull = useCallback(() => {
    if (fullTimer.current) clearTimeout(fullTimer.current)
    if (!full) {
      setFull(true)
      setFullAnim('in')
    } else {
      // Повернення окремою анімацією. Клас НЕ знімаємо після неї:
      // зняття перезапустило б базову modalExpand з нуля (повторна максимізація).
      // modalFullOut у forwards-режимі тримає кінцеву геометрію звичайної модалки.
      setFullAnim('out')
      fullTimer.current = setTimeout(() => {
        setFull(false)
      }, 280)
    }
  }, [full])

  useEffect(
    () => () => {
      if (fullTimer.current) clearTimeout(fullTimer.current)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  // Анмаунт з відкритою модалкою (навігація) — повертаємо скрол.
  const expandedRef = useRef(false)
  expandedRef.current = expanded
  useEffect(
    () => () => {
      if (expandedRef.current) unlockBody()
    },
    [],
  )

  // Сповіщаємо батька про повне закриття модалки (після анімації),
  // щоб можна було скинути внутрішній стан (редагування, чернетка).
  // Завжди викликаємо актуальний колбек через ref, щоб не залежати
  // від замикань. На монтуванні не викликається.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const wasExpandedRef = useRef(false)
  useEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      onCloseRef.current?.()
    }
    wasExpandedRef.current = expanded
  }, [expanded])

  const onBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return
    // На повному екрані видно лише верхню смугу фону — клік по ній
    // згортає до звичайної модалки, а не закриває картку
    if (full) toggleFull()
    else close()
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
    if (closing && !fading) {
      clearCloseTimer()
      setFading(true)
    }
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
      if (prevFocusRef.current?.isConnected) prevFocusRef.current.focus?.()
    }
  }

  // Прихована копія (wrapper) і копія в модалці отримують різний контекст:
  // modal=true означає «це справжній розгорнутий вигляд»
  const collapsedCtx = useMemo(
    () => ({ expanded, open, modal: false, full: false }),
    [expanded, open],
  )
  const modalCtx = useMemo(
    () => ({ expanded: true, open, modal: true, full }),
    [open, full],
  )

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
            >
              <div
                ref={modalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Розгорнута картка світу"
                className={`${styles.modal} ${wide ? styles.modalWide : ''} ${
                  extraWide ? styles.modalExtraWide : ''
                } ${modalClassName} ${
                  closing ? styles.modalClosing : ''
                } ${fading ? styles.modalFadingOut : ''} ${
                  fullAnim === 'in' ? styles.modalFullIn : ''
                } ${fullAnim === 'out' ? styles.modalFullOut : ''}`}
                style={{
                  '--origin-x': `${rect.left}px`,
                  '--origin-y': `${rect.top}px`,
                  '--origin-w': `${rect.width}px`,
                  '--origin-h': `${rect.height}px`,
                }}
                onAnimationEnd={onModalAnimEnd}
                onTransitionEnd={onModalTransitionEnd}
              >
                {!full && (
                  <button
                    type="button"
                    className={styles.fullBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFull()
                    }}
                    aria-label="На весь екран"
                    title="На весь екран"
                  >
                    <FullscreenIcon fontSize="small" />
                  </button>
                )}
                <div className={`${styles.modalContent} ${full ? 'wl-modal-full' : ''}`}>
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
