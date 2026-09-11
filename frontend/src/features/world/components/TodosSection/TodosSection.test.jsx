// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import api from '../../../../api'
import UndoProvider from '../../../../shared/undo/UndoProvider'
import TodosSection from './TodosSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const todos = [
  { id: 1, world: 1, project: null, title: 'A', is_done: false, priority: 'medium', order: 0 },
  { id: 2, world: 1, project: null, title: 'B', is_done: false, priority: 'medium', order: 0 },
  { id: 3, world: 1, project: null, title: 'C', is_done: false, priority: 'medium', order: 0 },
]

let serverTodos = []

function mockApi() {
  serverTodos = todos.map((t) => ({ ...t }))
  api.get.mockImplementation((url) => {
    if (url.includes('/todos/')) return Promise.resolve({ data: serverTodos.map((t) => ({ ...t })) })
    return Promise.resolve({ data: [] })
  })
  api.post.mockImplementation((url, payload) => {
    if (url.includes('/todos/reorder/')) {
      payload.ids.forEach((id, index) => {
        const t = serverTodos.find((x) => x.id === id)
        if (t) t.order = index
      })
      return Promise.resolve({ data: { ok: true, ids: payload.ids } })
    }
    return Promise.resolve({ data: {} })
  })
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <UndoProvider>
          <TodosSection worldId="1" accent="#a33" userRole="owner" />
        </UndoProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const rowOf = (title) =>
  screen.getByText(title).closest('[draggable="true"]')

const titlesInDomOrder = () =>
  screen.getAllByText(/^[ABC]$/).map((el) => el.textContent)

function dragEventProps() {
  const store = {}
  return {
    dataTransfer: {
      effectAllowed: '',
      dropEffect: '',
      setData: (k, v) => {
        store[k] = v
      },
      getData: (k) => store[k],
    },
  }
}

describe('TodosSection drag-and-drop reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => cleanup())

  it('drops first row onto last and persists the order', async () => {
    setup()
    // Початковий порядок: нові зверху (C, B, A)
    await waitFor(() => {
      expect(titlesInDomOrder()).toEqual(['C', 'B', 'A'])
    })

    const rowA = rowOf('A')
    const rowC = rowOf('C')
    expect(rowA).not.toBeNull()
    expect(rowC).not.toBeNull()

    fireEvent.dragStart(rowA, dragEventProps())
    // setDrag ставиться через requestAnimationFrame — чекаємо його
    await waitFor(() => {
      expect(rowOf('A').className).toMatch(/todoDragging/)
    })
    fireEvent.dragOver(rowC, dragEventProps())
    fireEvent.drop(rowC, dragEventProps())

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/worlds/1/todos/reorder/', {
        project: null,
        ids: [1, 3, 2],
      })
    })
    // Після рефетчу сервер повертає новий порядок: A переїхав нагору
    await waitFor(() => {
      expect(titlesInDomOrder()).toEqual(['A', 'C', 'B'])
    })
  })
})
