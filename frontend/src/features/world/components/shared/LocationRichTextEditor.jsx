import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import { useLocations, categoryLabel } from './locationData'
import { useLocationViewer } from './LocationViewer'
import styles from './LocationRichTextEditor.module.css'
import sharedStyles from './section.module.css'

const ENTER = 'Enter'
const TAB = 'Tab'
const UP = 'ArrowUp'
const DOWN = 'ArrowDown'
const ESCAPE = 'Escape'

// Ділимо введений текст на сегменти: звичайний текст і локації (бейджі).
// Назви збігаються регістронезалежно, довші назви мають пріоритет.
function segmentsOf(value, locList) {
  const list = (locList || []).filter((l) => l.name)
  if (!value || list.length === 0) return [{ type: 'text', value }]
  const sorted = [...list].sort((a, b) => b.name.length - a.name.length)
  const escaped = sorted.map((l) => l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const out = []
  let lastIndex = 0
  let m
  while ((m = re.exec(value)) !== null) {
    const matched = m[0]
    const found = sorted.find((l) => l.name.toLowerCase() === matched.toLowerCase())
    if (m.index > lastIndex) out.push({ type: 'text', value: value.slice(lastIndex, m.index) })
    out.push({ type: 'loc', value: matched, location: found })
    lastIndex = m.index + matched.length
    if (m.index === re.lastIndex) re.lastIndex++
  }
  if (lastIndex < value.length) out.push({ type: 'text', value: value.slice(lastIndex) })
  return out
}

// Позиція курсора (в символах плоского тексту) у contenteditable.
function caretPlainIndex(el) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el)
  range.setEnd(sel.anchorNode, sel.anchorOffset)
  return range.toString().length
}

// Ставимо курсор на позицію `plainIndex` у плоскому тексті ел.
function placeCaret(el, plainIndex) {
  let remaining = typeof plainIndex === 'number' ? plainIndex : el.textContent.length
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node
  let targetNode = null
  let targetOffset = 0
  while ((node = walker.nextNode())) {
    const len = node.textContent.length
    if (remaining <= len) {
      targetNode = node
      targetOffset = remaining
      break
    }
    remaining -= len
  }
  const range = document.createRange()
  if (targetNode) {
    range.setStart(targetNode, targetOffset)
  } else {
    range.selectNodeContents(el)
    range.collapse(false)
  }
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

export default function LocationRichTextEditor({
  worldId,
  locations: locationsProp,
  value = '',
  onChange,
  label,
  multiline = false,
  minRows,
  maxRows,
  placeholder = '',
  required,
  autoFocus,
}) {
  const { data: fetchedLocations = [] } = useLocations(worldId)
  const locations = locationsProp ?? fetchedLocations
  const { openLocation } = useLocationViewer()

  const editableRef = useRef(null)
  const popupRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const [caretIdx, setCaretIdx] = useState(null)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  // Рендер сегментів у DOM (баджів) — керований зовнішнім value.
  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    const prevCaret = caretIdx
    const plain = value ?? ''
    el.innerHTML = ''
    const segments = segmentsOf(plain, locations)
    for (const seg of segments) {
      if (seg.type === 'text') {
        el.appendChild(document.createTextNode(seg.value))
      } else if (seg.location) {
        const b = document.createElement('span')
        b.className = styles.badge
        b.contentEditable = 'false'
        b.textContent = seg.value
        b.title = `Відкрити локацію «${seg.value}» (${categoryLabel(seg.location.category)})`
        b.addEventListener('click', (e) => {
          e.stopPropagation()
          openLocation(seg.location)
        })
        el.appendChild(b)
      }
    }
    if (document.activeElement === el) {
      placeCaret(el, prevCaret ?? plain.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locations])

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (q.length < 3) return []
    const list = []
    for (const l of locations) {
      if (list.length >= 8) break
      if (l.name && l.name.toLowerCase().includes(q.toLowerCase())) list.push(l.name)
    }
    return list
  }, [query, locations])

  const updateCaretAndQuery = useCallback(() => {
    const el = editableRef.current
    if (!el) return
    const idx = caretPlainIndex(el)
    setCaretIdx(idx)
    if (idx != null) {
      const text = el.textContent
      let start = idx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      setQuery(text.slice(start, idx))
    }
  }, [])

  const handleInput = useCallback(() => {
    const el = editableRef.current
    if (!el) return
    const idx = caretPlainIndex(el)
    setCaretIdx(idx)
    onChange?.({ target: { value: el.textContent } })
    if (idx != null) {
      const text = el.textContent
      let start = idx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      setQuery(text.slice(start, idx))
    }
    setHighlight(0)
  }, [onChange])

  const commitToken = useCallback(
    (replacement) => {
      const el = editableRef.current
      if (!el) return
      const text = el.textContent
      const idx = caretIdx ?? text.length
      let start = idx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      const next = `${text.slice(0, start)}${replacement}${text.slice(idx)}`
      setCaretIdx(start + replacement.length)
      setQuery('')
      onChange?.({ target: { value: next } })
    },
    [caretIdx, onChange],
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (suggestions.length === 0) {
        if (e.key === ESCAPE) setQuery('')
        return
      }
      if (e.key === DOWN) {
        e.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
      } else if (e.key === UP) {
        e.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === ENTER || e.key === TAB) {
        e.preventDefault()
        commitToken(suggestions[highlight])
      } else if (e.key === ESCAPE) {
        setQuery('')
      }
    },
    [suggestions, highlight, commitToken],
  )

  const onFocus = useCallback(() => {
    setFocused(true)
    // Відложено, щоб SVG/label встигли перемалюватися
    requestAnimationFrame(updateCaretAndQuery)
  }, [updateCaretAndQuery])
  const onBlur = useCallback(() => {
    setFocused(false)
    setQuery('')
  }, [])
  const onMouseUp = useCallback(() => {
    updateCaretAndQuery()
  }, [updateCaretAndQuery])
  const onKeyUp = useCallback(() => {
    updateCaretAndQuery()
  }, [updateCaretAndQuery])

  const rowStyle = {}
  if (multiline) {
    rowStyle.minHeight = (minRows ?? 2) * 24 + 20
    if (maxRows) rowStyle.maxHeight = maxRows * 24 + 20
    rowStyle.overflowY = 'auto'
  }

  const showPopup = focused && suggestions.length > 0

  return (
    <div className={`${styles.root} ${focused ? styles.focused : ''}`}>
      <div
        ref={editableRef}
        className={`${styles.editable} ${multiline ? styles.multiline : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={multiline || undefined}
        data-placeholder={placeholder}
        style={rowStyle}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={onKeyUp}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseUp={onMouseUp}
        autoFocus={autoFocus}
      />
      <label className={`${styles.label} ${focused || value ? styles.labelFloat : ''}`}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>

      {showPopup && (
        <div className={styles.popup} ref={popupRef}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`${styles.option} ${i === highlight ? styles.optionActive : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                commitToken(s)
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <PlaceOutlinedIcon fontSize="small" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
