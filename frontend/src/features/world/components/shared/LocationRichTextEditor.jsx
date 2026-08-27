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

// Нульовий роздільник — невидима «позиція редагування» навколо бейджа.
// Дає змогу ставити каретку й друкувати одразу до/після/між бейджами,
// бо бейдж сам по собі contenteditable=false. Очищається зі значення.
const ZWS = '\u200B'

const isZWSNode = (node) => node.nodeType === Node.TEXT_NODE && node.data === ZWS
const plainText = (el) => ((el && el.textContent) || '').replace(new RegExp(ZWS, 'g'), '')

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

// Walk-фільтр для редагувального вмісту: враховуємо «живі» текстові вузли
// та бейджі (нередаговані елементи) як атомарні юніти. Нульові роздільники
// ігноруються (0 юнітів). Текст усередині бейджа не включаємо окремо.
const EDITABLE_WALK = {
  acceptNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (isZWSNode(node)) return NodeFilter.FILTER_REJECT
      if (node.parentElement && node.parentElement.isContentEditable === false) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.isContentEditable === false) return NodeFilter.FILTER_ACCEPT
    return NodeFilter.FILTER_SKIP
  },
}

// Кількість юнітів у зоні редагування: кожен символ тексту — 1, кожен бейдж — 1.
function countUnits(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, EDITABLE_WALK)
  let units = 0
  let node
  while ((node = walker.nextNode())) units += node.nodeType === Node.TEXT_NODE ? node.textContent.length : 1
  return units
}

// Кількість юнітів перед конкретним вузлом (враховуючи текст і бейджі).
function unitsBefore(el, targetEl) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, EDITABLE_WALK)
  let units = 0
  let node
  while ((node = walker.nextNode())) {
    if (node === targetEl) return units
    units += node.nodeType === Node.TEXT_NODE ? node.textContent.length : 1
  }
  return units
}

// Бейдж, що стоїть безпосередньо перед кареткою (між ним і кареткою лише
// нульові роздільники/нічого). Якщо такого немає — null.
function badgeBeforeCaret(el) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null
  if (!sel.getRangeAt(0).collapsed) return null
  const anchor = sel.anchorNode
  if (anchor.nodeType !== Node.TEXT_NODE) return null
  let node
  if (anchor.data === ZWS) {
    node = anchor.previousSibling
  } else {
    if (sel.anchorOffset !== 0) return null
    node = anchor.previousSibling
  }
  while (node && node.nodeType === Node.TEXT_NODE && node.data === ZWS) node = node.previousSibling
  if (node && node.nodeType === Node.ELEMENT_NODE && node.isContentEditable === false) return node
  return null
}

// Бейдж, що стоїть безпосередньо після каретки (між ним і кареткою лише
// нульові роздільники/нічого). Якщо такого немає — null.
function badgeAfterCaret(el) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null
  if (!sel.getRangeAt(0).collapsed) return null
  const anchor = sel.anchorNode
  if (anchor.nodeType !== Node.TEXT_NODE) return null
  let node
  if (anchor.data === ZWS) {
    node = anchor.nextSibling
  } else {
    if (sel.anchorOffset !== anchor.data.length) return null
    node = anchor.nextSibling
  }
  while (node && node.nodeType === Node.TEXT_NODE && node.data === ZWS) node = node.nextSibling
  if (node && node.nodeType === Node.ELEMENT_NODE && node.isContentEditable === false) return node
  return null
}

// Позиція курсора в «юнітному» просторі (бейдж = один атом).
function caretUnit(el) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null
  const anchor = sel.anchorNode
  const offset = sel.anchorOffset
  if (anchor === el) return countUnits(el)
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, EDITABLE_WALK)
  let units = 0
  let node
  while ((node = walker.nextNode())) {
    if (node === anchor) return units + (node.nodeType === Node.TEXT_NODE ? offset : 1)
    units += node.nodeType === Node.TEXT_NODE ? node.textContent.length : 1
  }
  return units
}

// Позиція курсора (в символах плоского тексту) — для слова/запиту.
// Нульові роздільники не рахуються.
function caretPlainIndex(el) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null
  const anchor = sel.anchorNode
  const offset = sel.anchorOffset
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let count = 0
  let node
  while ((node = walker.nextNode())) {
    if (node === anchor) {
      if (isZWSNode(node)) return count
      return count + offset
    }
    if (isZWSNode(node)) continue
    count += node.textContent.length
  }
  return count
}

// Ставимо курсор на юнітну позицію `unitIndex`, ніколи не всередину бейджа.
// Backspace поруч з бейджем (contentEditable=false) видаляє його атомарно.
function placeCaret(el, unitIndex) {
  let remaining = typeof unitIndex === 'number' ? unitIndex : countUnits(el)
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, EDITABLE_WALK)
  const range = document.createRange()
  let placed = false
  let node
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.textContent.length) {
        range.setStart(node, remaining)
        placed = true
        break
      }
      remaining -= node.textContent.length
    } else {
      if (remaining < 1) {
        range.setStartBefore(node)
        placed = true
        break
      }
      if (remaining === 1) {
        range.setStartAfter(node)
        placed = true
        break
      }
      remaining -= 1
    }
  }
  if (!placed) {
    range.selectNodeContents(el)
    range.collapse(false)
  } else {
    range.collapse(true)
  }
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
        if (seg.value) el.appendChild(document.createTextNode(seg.value))
      } else if (seg.location) {
        // Нульовий роздільник до та після бейджа забезпечує редагувану
        // позицію, щоб каретку можна було ставити/друкувати навколо бейджа.
        el.appendChild(document.createTextNode(ZWS))
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
        el.appendChild(document.createTextNode(ZWS))
      }
    }
    if (document.activeElement === el) {
      placeCaret(el, prevCaret ?? countUnits(el))
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
    setCaretIdx(caretUnit(el))
    const plainIdx = caretPlainIndex(el)
    if (plainIdx != null) {
      const text = plainText(el)
      let start = plainIdx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      setQuery(text.slice(start, plainIdx))
    }
  }, [])

  const handleInput = useCallback(() => {
    const el = editableRef.current
    if (!el) return
    setCaretIdx(caretUnit(el))
    onChange?.({ target: { value: plainText(el) } })
    const plainIdx = caretPlainIndex(el)
    if (plainIdx != null) {
      const text = plainText(el)
      let start = plainIdx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      setQuery(text.slice(start, plainIdx))
    }
    setHighlight(0)
  }, [onChange])

  const commitToken = useCallback(
    (replacement) => {
      const el = editableRef.current
      if (!el) return
      const text = plainText(el)
      const plainIdx = caretPlainIndex(el) ?? text.length
      let start = plainIdx
      while (start > 0 && !/\s/.test(text[start - 1])) start--
      const next = `${text.slice(0, start)}${replacement}${text.slice(plainIdx)}`
      const curUnit = caretUnit(el) ?? countUnits(el)
      const unitStart = curUnit - (plainIdx - start)
      setCaretIdx(unitStart + 1)
      setQuery('')
      onChange?.({ target: { value: next } })
    },
    [onChange],
  )

  const removeBadge = useCallback(
    (badgeEl, caretUnitPos) => {
      const el = editableRef.current
      if (!el) return
      const prev = badgeEl.previousSibling
      const next = badgeEl.nextSibling
      badgeEl.remove()
      if (prev && isZWSNode(prev)) prev.remove()
      if (next && isZWSNode(next)) next.remove()
      setCaretIdx(caretUnitPos)
      setQuery('')
      setHighlight(0)
      onChange?.({ target: { value: plainText(el) } })
    },
    [onChange],
  )

  const handleKeyDown = useCallback(
    (e) => {
      const el = editableRef.current
      if (e.key === 'Backspace') {
        const badge = badgeBeforeCaret(el)
        if (badge) {
          e.preventDefault()
          const unitPos = unitsBefore(el, badge)
          removeBadge(badge, unitPos)
          return
        }
      } else if (e.key === 'Delete') {
        const badge = badgeAfterCaret(el)
        if (badge) {
          e.preventDefault()
          const unitPos = unitsBefore(el, badge)
          removeBadge(badge, unitPos)
          return
        }
      }
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
    [suggestions, highlight, commitToken, removeBadge],
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
