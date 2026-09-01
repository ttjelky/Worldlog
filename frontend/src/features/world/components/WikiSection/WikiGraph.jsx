import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force'
import api from '../../../../api'
import styles from './WikiGraph.module.css'

const NS = 'http://www.w3.org/2000/svg'
const PAD = 90
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const FIT_MAX = 1.1

function make(name, attrs) {
  const el = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'text') el.textContent = value
    else if (value !== undefined) el.setAttribute(key, value)
  }
  return el
}

// Створює макет і малює граф у шарі viewport. Повертає об'єкт з даними
// для керування (прив'язка вузлів, ребер, симуляції) та fit-параметрами.
function buildGraph(svg, canvas, viewport, nodes, edges) {
  while (viewport.firstChild) viewport.removeChild(viewport.firstChild)

  const cw = Math.max(canvas.clientWidth, 300)
  const ch = Math.max(canvas.clientHeight, 300)

  const n = nodes.length
  const spacing = n > 60 ? 105 : n > 30 ? 140 : n > 14 ? 175 : 200
  const charge = n > 60 ? -650 : n > 30 ? -460 : n > 14 ? -320 : -260
  const collideR = n > 60 ? 30 : 38

  const degrees = new Map(nodes.map((nd) => [nd.id, 0]))
  edges.forEach((e) => {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1)
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1)
  })

  const simNodes = nodes.map((nd) => ({ ...nd }))
  const simEdges = edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: e.kind,
    label: e.label || '',
  }))

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink(simEdges).id((d) => d.id).distance(spacing).strength(0.5),
    )
    .force('charge', forceManyBody(charge))
    .force('collide', forceCollide(collideR))
    .stop()
  simulation.alphaDecay(0.04)
  simulation.velocityDecay(0.4)
  for (let i = 0; i < 600; i++) simulation.tick()

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  simNodes.forEach((nd) => {
    if (!Number.isFinite(nd.x) || !Number.isFinite(nd.y)) return
    if (nd.x < minX) minX = nd.x
    if (nd.y < minY) minY = nd.y
    if (nd.x > maxX) maxX = nd.x
    if (nd.y > maxY) maxY = nd.y
  })
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 300
    maxY = 300
  }
  const bw = maxX - minX + PAD * 2
  const bh = maxY - minY + PAD * 2

  // Ребра
  const edgeEls = []
  simEdges.forEach((e) => {
    if (!e.source || !e.target || e.source === e.target) return
    const line = make('line', {
      class: styles.edge,
      stroke: e.kind === 'rel' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.32)',
      'stroke-width': e.kind === 'rel' ? 2 : 1.5,
    })
    line.__nodes = [e.source, e.target]
    line.__kind = e.kind
    viewport.appendChild(line)
    edgeEls.push(line)
  })

  // Вузли
  const nodeEls = new Map()
  const measurer = make('text', { class: styles.nodeLabel, visibility: 'hidden', 'aria-hidden': 'true' })
  viewport.appendChild(measurer)
  simNodes.forEach((nd) => {
    const g = drawNode(simNodes, nd, degrees.get(nd.id) || 1, measurer)
    g.__node = nd
    viewport.appendChild(g)
    nodeEls.set(nd.id, g)
  })

  const position = () => {
    edgeEls.forEach((line) => {
      const [s, t] = line.__nodes
      line.setAttribute('x1', s.x)
      line.setAttribute('y1', s.y)
      line.setAttribute('x2', t.x)
      line.setAttribute('y2', t.y)
    })
    simNodes.forEach((nd) => {
      const g = nodeEls.get(nd.id)
      if (g) g.setAttribute('transform', `translate(${nd.x}, ${nd.y})`)
    })
  }
  position()

  const fit = (viewRef, apply) => {
    const k = Math.min(FIT_MAX, Math.min(cw / bw, ch / bh))
    const tx = (cw - bw * k) / 2 - minX * k
    const ty = (ch - bh * k) / 2 - minY * k
    viewRef.current = { k, tx, ty }
    apply()
  }

  const interactions = {
    viewport,
    simNodes,
    nodeEls,
    edgeEls,
    position,
  }

  return { cw, ch, fit, interactions }
}

const LABEL_MAXW = 150

function wrapLabel(title, maxW, measurer) {
  const measure = (s) => {
    measurer.textContent = s
    return measurer.getComputedTextLength()
  }
  const words = String(title || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines = []
  let line = ''
  const flush = () => {
    if (line) lines.push(line)
    line = ''
  }
  const sliceWord = (word) => {
    let cur = ''
    for (const ch of word) {
      const trial = cur + ch
      if (cur && measure(trial) > maxW) {
        lines.push(cur)
        cur = ch
      } else {
        cur = trial
      }
    }
    if (cur) lines.push(cur)
  }

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate) <= maxW) {
      line = candidate
    } else {
      flush()
      if (measure(word) > maxW) sliceWord(word)
      else line = word
    }
  }
  flush()
  return lines
}

function drawNode(simNodes, node, degree, measurer) {
  const isExternal = typeof node.id === 'string' && node.id.includes(':')
  const r = isExternal ? 24 : Math.min(34, 16 + degree * 2)
  const g = make('g', { class: isExternal ? styles.nodeExternal : styles.node, tabindex: 0 })

  const circle = make('circle', {
    r,
  })
  g.appendChild(circle)

  g.appendChild(
    make('text', {
      x: 0,
      y: 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      class: styles.nodeEmoji,
      text: node.emoji || '📄',
    }),
  )

  const labelLines = wrapLabel(node.title, LABEL_MAXW, measurer)
  const text = make('text', {
    x: 0,
    y: r + 16,
    'text-anchor': 'middle',
    class: styles.nodeLabel,
  })
  labelLines.forEach((ln, i) => {
    text.appendChild(make('tspan', { x: 0, dy: i > 0 ? '1.3em' : 0, text: ln }))
  })
  g.appendChild(text)

  g.appendChild(make('title', { text: node.title }))
  return g
}

export default function WikiGraph({ worldId, onOpen }) {
  const svgRef = useRef(null)
  const canvasRef = useRef(null)
  const viewportRef = useRef(null)
  const viewRef = useRef({ k: 1, tx: 0, ty: 0 })
  const onOpenRef = useRef(onOpen)
  const fitRef = useRef(null)
  const interactionsRef = useRef(null)
  const [zoom, setZoom] = useState(1)

  const commitView = useCallback((v) => {
    viewRef.current = v
    setZoom(v.k)
  }, [])

  const apply = useCallback(() => {
    const { k, tx, ty } = viewRef.current
    if (viewportRef.current) {
      viewportRef.current.setAttribute('transform', `translate(${tx}, ${ty}) scale(${k})`)
    }
  }, [])

  useEffect(() => {
    onOpenRef.current = onOpen
  })

  const { data } = useQuery({
    queryKey: ['wiki', String(worldId), 'graph'],
    queryFn: () => api.get(`/worlds/${worldId}/wiki/graph/`).then((r) => r.data),
  })

  useEffect(() => {
    const svg = svgRef.current
    const canvas = canvasRef.current
    if (!svg || !canvas || !data) return

    const nodes = data.nodes || []
    const edges = (data.edges || []).filter(
      (e) => nodes.some((nn) => nn.id === e.source) && nodes.some((nn) => nn.id === e.target),
    )
    if (nodes.length === 0) return

    // viewBox збігається з реальним розміром контейнера: 1 юніт == 1 px,
    // граф може виходити за межі і бути "зрізаним" (кліп по контейнеру).
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    svg.setAttribute('viewBox', `0 0 ${cw} ${ch}`)
    viewportRef.current = svg.querySelector('[data-viewport]') || null
    if (!viewportRef.current) {
      viewportRef.current = make('g', { 'data-viewport': '' })
      svg.appendChild(viewportRef.current)
    }

    const built = buildGraph(svg, canvas, viewportRef.current, nodes, edges)
    interactionsRef.current = built.interactions
    fitRef.current = () => {
      built.fit(viewRef, apply)
      setZoom(viewRef.current.k)
    }
    fitRef.current()
  }, [data, apply])

  // ——— Масштабування (колесо) ———
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e) => {
      e.preventDefault()
      const v = viewRef.current
      const rect = svg.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * factor))
      const kw = v.k / k
      const tx = px - (px - v.tx) * kw
      const ty = py - (py - v.ty) * kw
      commitView({ k, tx, ty })
      apply()
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [apply, commitView])

  // ——— Панорамування фону + dragging/клік вузлів ———
  useEffect(() => {
    const svg = svgRef.current
    const canvas = canvasRef.current
    if (!svg || !canvas) return

    let pan = null
    let drag = null

    const screenToWorld = (sx, sy) => {
      const v = viewRef.current
      return { x: (sx - v.tx) / v.k, y: (sy - v.ty) / v.k }
    }

    const onBackgroundDown = (e) => {
      if (e.button !== 0) return
      if (e.target !== svg && e.target !== canvas) return
      const v = viewRef.current
      pan = { startX: e.clientX, startY: e.clientY, tx: v.tx, ty: v.ty, moved: false }
    }

    const onNodeDown = (e, g, node) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.button !== 0) return
      drag = {
        g,
        node,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      }
    }

    const onMove = (e) => {
      if (pan) {
        const dx = e.clientX - pan.startX
        const dy = e.clientY - pan.startY
        if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true
        const v = viewRef.current
        viewRef.current = { k: v.k, tx: pan.tx + dx, ty: pan.ty + dy }
        apply()
        return
      }
      if (drag) {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
        const w = screenToWorld(drag.startX + dx, drag.startY + dy)
        drag.node.x = w.x
        drag.node.y = w.y
        interactionPosition()
        return
      }
    }

    const onUp = () => {
      if (drag) {
        if (!drag.moved) {
          // клік по вузлу (wikі-сторінці)
          const id = drag.node.id
          if (typeof id === 'number') onOpenRef.current?.(id)
        }
        drag = null
      }
      pan = null
    }

    const interactionPosition = () => {
      interactionsRef.current?.position()
    }

    svg.addEventListener('pointerdown', onBackgroundDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    // вішаємо pointerdown на вузли (вони перестворюються при перемалюванні,
    // тому глядаємо нового через MutationObserver)
    const attachNodeHandlers = () => {
      if (!interactionsRef.current) return
      interactionsRef.current.nodeEls.forEach((g) => {
        if (g.__handlers) return
        const node = g.__node
        g.addEventListener('pointerdown', (e) => onNodeDown(e, g, node))
        g.__handlers = true
      })
    }
    attachNodeHandlers()
    const observer = new MutationObserver(attachNodeHandlers)
    observer.observe(svg, { childList: true, subtree: true })

    return () => {
      svg.removeEventListener('pointerdown', onBackgroundDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      observer.disconnect()
    }
  }, [apply])

  const zoomIn = () => {
    const v = viewRef.current
    const k = Math.min(ZOOM_MAX, v.k * 1.3)
    const rect = svgRef.current.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const kw = v.k / k
    commitView({ k, tx: cx - (cx - v.tx) * kw, ty: cy - (cy - v.ty) * kw })
    apply()
  }
  const zoomOut = () => {
    const v = viewRef.current
    const k = Math.max(ZOOM_MIN, v.k / 1.3)
    const rect = svgRef.current.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const kw = v.k / k
    commitView({ k, tx: cx - (cx - v.tx) * kw, ty: cy - (cy - v.ty) * kw })
    apply()
  }
  const resetView = () => {
    if (fitRef.current) fitRef.current()
  }

  const nodeCount = data?.nodes?.length || 0

  return (
    <div className={styles.graphWrap}>
      {nodeCount === 0 ? (
        <p className={styles.empty}>
          Намалюй граф світу: додай сторінки й згадай одну в іншій через [[Назва]], або звʼяжи
          елементи світу (персонажі, локації, проєкти…) — звʼязки зʼявляться тут.
        </p>
      ) : (
        <div className={styles.canvas} ref={canvasRef}>
          <div className={styles.controls}>
            <div className={styles.controlsGroup}>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={resetView}
                title="Вписати у вікно"
                aria-label="Вписати у вікно"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M4 4h5v2H6v3H4V4zm11 0h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm12 0h2v3h-3v2h5v-5z"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.controlsGroup}>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                aria-label="Зменшити"
              >
                −
              </button>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                aria-label="Збільшити"
              >
                +
              </button>
            </div>
          </div>
          <svg ref={svgRef} className={styles.svg} />
          <p className={styles.hint}>Колесо — масштаб · перетягни фон для прокрутки · вузол для переміщення</p>
        </div>
      )}
    </div>
  )
}
