import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import api from '../../../../api'
import styles from './WikiGraph.module.css'

const NS = 'http://www.w3.org/2000/svg'

function make(name, attrs) {
  const el = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'text') el.textContent = value
    else el.setAttribute(key, value)
  }
  return el
}

function draw(svg, nodes, edges, onOpenRef) {
  svg.replaceChildren()
  const rect = svg.getBoundingClientRect()
  const width = Math.max(rect.width, 200)
  const height = Math.max(rect.height, 300)

  const degrees = new Map(nodes.map((n) => [n.id, 0]))
  edges.forEach((e) => {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1)
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1)
  })

  const simNodes = nodes.map((n) => ({ ...n }))
  const simEdges = edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind }))

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink(simEdges)
        .id((d) => d.id)
        .distance(140)
        .strength(0.7),
    )
    .force('charge', forceManyBody(-280))
    .force('collide', forceCollide(42))
    .force('x', forceX(width / 2).strength(0.05))
    .force('y', forceY(height / 2).strength(0.05))
    .stop()
  for (let i = 0; i < 400; i++) simulation.tick()

  const pad = 50
  const clamp = (v, max) => Math.max(pad, Math.min(max - pad, v))

  simEdges.forEach((e) => {
    if (e.source === e.target || !e.source.x || !e.target.x) return
    const line = make('line', {
      x1: e.source.x,
      y1: e.source.y,
      x2: e.target.x,
      y2: e.target.y,
      stroke: e.kind === 'rel' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.32)',
      'stroke-width': 1.5,
    })
    svg.appendChild(line)
  })

  simNodes.forEach((node) => {
    const x = clamp(node.x, width)
    const y = clamp(node.y, height)
    const r = Math.min(34, 16 + (degrees.get(node.id) || 1) * 2.2)

    const g = make('g', { transform: `translate(${x}, ${y})`, class: styles.node })
    g.style.cursor = 'pointer'
    g.appendChild(
      make('circle', {
        r,
        fill: 'rgba(255,255,255,0.14)',
        stroke: 'rgba(255,255,255,0.45)',
        'stroke-width': 1.5,
      }),
    )
    g.appendChild(
      make('text', {
        x: 0,
        y: 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': 20,
        text: node.emoji || '📄',
      }),
    )
    g.appendChild(
      make('text', {
        x: 0,
        y: r + 16,
        'text-anchor': 'middle',
        'font-size': 11,
        fill: 'rgba(255,255,255,0.95)',
        'font-weight': 600,
        text: node.title,
      }),
    )
    g.appendChild(make('title', { text: node.title }))
    g.addEventListener('click', () => onOpenRef.current?.(node.id))
    svg.appendChild(g)
  })
}

export default function WikiGraph({ worldId, onOpen }) {
  const svgRef = useRef(null)
  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onOpenRef.current = onOpen
  })

  const { data } = useQuery({
    queryKey: ['wiki', String(worldId), 'graph'],
    queryFn: () => api.get(`/worlds/${worldId}/wiki/graph/`).then((r) => r.data),
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !data) return
    const nodes = data.nodes || []
    const edges = (data.edges || []).filter(
      (e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target),
    )
    draw(svg, nodes, edges, onOpenRef)
  }, [data])

  const nodeCount = data?.nodes?.length || 0

  return (
    <div className={styles.graphWrap}>
      {nodeCount === 0 ? (
        <p className={styles.empty}>
          Намалюй граф світу: додай сторінки й згадай одну в іншій через [[Назва]] — звʼязки
          зʼявляться тут.
        </p>
      ) : (
        <svg ref={svgRef} className={styles.svg} width="100%" height={480} />
      )}
    </div>
  )
}