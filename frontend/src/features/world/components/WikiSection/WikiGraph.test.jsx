// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import api from '../../../../api'
import WikiGraph from './WikiGraph'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn() },
}))

const graph = {
  nodes: [
    { id: 1, type: 'character', title: 'Грім', emoji: '🧙' },
    { id: 2, type: 'character', title: 'Тінь', emoji: '🧙' },
  ],
  edges: [{ source: 1, target: 2, kind: 'rel', label: '' }],
}

const LAYOUT_KEY = 'worldlog:graph-layout:1'

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url.includes('/wiki/graph/')) {
      return Promise.resolve({ data: JSON.parse(JSON.stringify(graph)) })
    }
    return Promise.resolve({ data: [] })
  })
}

function setup(onOpen) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <WikiGraph worldId="1" onOpen={onOpen ?? (() => {})} />
    </QueryClientProvider>,
  )
}

describe('WikiGraph layout persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
    localStorage.clear()
    if (typeof window.ResizeObserver === 'undefined') {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    for (const proto of [
      window.SVGTextContentElement?.prototype,
      window.SVGElement?.prototype,
    ]) {
      if (proto && !proto.getComputedTextLength) {
        proto.getComputedTextLength = () => 42
      }
    }
  })
  afterEach(() => cleanup())

  it('click on a node opens the wiki page', async () => {
    const onOpen = vi.fn()
    setup(onOpen)
    const node = await waitFor(() => {
      const el = document.querySelector('g[role="button"]')
      expect(el).not.toBeNull()
      return el
    })
    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerUp(window)
    expect(onOpen).toHaveBeenCalledWith(1)
  })

  it('saves node positions after dragging', async () => {
    const { container } = setup()
    const node = await waitFor(() => {
      const el = container.querySelector('g[role="button"]')
      expect(el).not.toBeNull()
      return el
    })

    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 160, clientY: 130 })
    fireEvent.pointerUp(window)

    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY))
    expect(saved).not.toBeNull()
    expect(Object.keys(saved).sort()).toEqual(['1', '2'])
    expect(saved['1']).toMatchObject({ x: expect.any(Number), y: expect.any(Number) })
  })

  it('reset button clears saved layout', async () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ 1: { x: 10, y: 20 } }))
    setup()
    await waitFor(() => {
      expect(screen.getByLabelText('Скинути розташування')).not.toBeNull()
    })
    fireEvent.click(screen.getByLabelText('Скинути розташування'))
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull()
  })
})
