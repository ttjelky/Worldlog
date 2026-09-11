// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import api from '../../../../api'
import ExpandableCard from '../shared/ExpandableCard'
import ProgressSection from './ProgressSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn() },
}))

const world = {
  id: 1,
  players_count: 2,
  locations_count: 3,
  todos_count: 4,
  todos_done: 1,
  history_count: 5,
  notes_count: 6,
  projects_count: 1,
  bookmarks_count: 7,
  ideas_count: 8,
  wiki_count: 9,
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ExpandableCard>
          <ProgressSection worldId="1" accent="#a33" />
        </ExpandableCard>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('ProgressSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  api.get.mockImplementation((url) => {
    if (url === '/worlds/1/') return Promise.resolve({ data: world })
    return Promise.resolve({ data: [] })
  })
  })
  afterEach(() => cleanup())

  it('reads all counters from the world object without per-type fetches', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('Гравці')).not.toBeNull()
    })
    expect(screen.getByText('2')).not.toBeNull()
    expect(
      screen.getByRole('progressbar', { name: 'Виконано завдань: 25%' }),
    ).not.toBeNull()
    const fetched = api.get.mock.calls.map(([url]) => url)
    expect(fetched).toEqual(['/worlds/1/'])
  })
})
