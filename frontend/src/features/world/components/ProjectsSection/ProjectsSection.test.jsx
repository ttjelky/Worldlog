// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import api from '../../../../api'
import ExpandableCard from '../shared/ExpandableCard'
import UndoProvider from '../../../../shared/undo/UndoProvider'
import ProjectsSection from './ProjectsSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const projects = [
  {
    id: 1,
    world: 1,
    title: 'Фортеця',
    description: '',
    due_date: null,
    todos_count: 2,
    todos_done: 2,
    progress: 100,
    created_at: '2026-01-01',
  },
  {
    id: 2,
    world: 1,
    title: 'Міст',
    description: '',
    due_date: null,
    todos_count: 1,
    todos_done: 0,
    progress: 0,
    created_at: '2026-01-02',
  },
]

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url.includes('/projects/')) return Promise.resolve({ data: projects })
    return Promise.resolve({ data: [] })
  })
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <UndoProvider>
          <ExpandableCard>
            <ProjectsSection worldId="1" accent="#a33" userRole="owner" />
          </ExpandableCard>
        </UndoProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

async function openFullscreen() {
  fireEvent.click(screen.getByLabelText('Розгорнути картку'))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByLabelText('На весь екран'))
  return dialog
}

describe('ProjectsSection fullscreen filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => cleanup())

  it('status chips filter the list in fullscreen', async () => {
    setup()
    const dialog = await openFullscreen()
    expect(
      within(dialog).queryByPlaceholderText('Знайти проєкт…'),
    ).not.toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Завершено' }))
    await waitFor(() => {
      expect(within(dialog).queryByText('Міст')).toBeNull()
    })
    expect(within(dialog).queryByText('Фортеця')).not.toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Завершено' }))
    await waitFor(() => {
      expect(within(dialog).queryByText('Міст')).not.toBeNull()
    })
  })

  it('search filters the list in fullscreen', async () => {
    setup()
    const dialog = await openFullscreen()
    fireEvent.change(within(dialog).getByPlaceholderText('Знайти проєкт…'), {
      target: { value: 'міст' },
    })
    await waitFor(() => {
      expect(within(dialog).queryByText('Фортеця')).toBeNull()
    })
    expect(within(dialog).queryByText('Міст')).not.toBeNull()
  })
})
