import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import styles from './ExpandableCard.module.css'

export default function ExpandableCard({ children, className = '' }) {
  const cardRef = useRef(null)
  const modalRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  const [rect, setRect] = useState(null)
  const prevFocusRef = useRef(null)

  const open = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    prevFocusRef.current = document.activeElement
    setRect(el.getBoundingClientRect())
    setClosing(false)
    setExpanded(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setClosing(true)
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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

  const onModalAnimEnd = () => {
    if (closing) {
      setExpanded(false)
      setClosing(false)
      setRect(null)
      prevFocusRef.current?.focus()
    }
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`${styles.wrapper} ${expanded ? styles.isExpanded : ''} ${className}`}
      >
        {children}
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
      </div>

      {expanded && rect &&
        createPortal(
          <div
            className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`}
            onClick={onBackdropClick}
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className={`${styles.modal} ${closing ? styles.modalClosing : ''}`}
              style={{
                '--origin-x': `${rect.left}px`,
                '--origin-y': `${rect.top}px`,
                '--origin-w': `${rect.width}px`,
                '--origin-h': `${rect.height}px`,
              }}
              onAnimationEnd={onModalAnimEnd}
            >
              <div className={styles.modalContent}>
                {children}
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  )
}
