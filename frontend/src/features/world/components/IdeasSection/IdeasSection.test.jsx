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
import FeedbackProvider from '../../../../shared/feedback/FeedbackProvider'
import IdeasSection from './IdeasSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const ideas = [
  { id: 1, world: 1, title: 'Портал', content: 'Магічний портал', status: 'open', votes: 0 },
  { id: 2, world: 1, title: 'Міст', content: '', status: 'rejected', votes: 5 },
]

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url.includes('/ideas/')) return Promise.resolve({ data: ideas.map((t) => ({ ...t })) })
    return Promise.resolve({ data: [] })
  })
  api.post.mockResolvedValue({ data: {} })
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <UndoProvider>
          <FeedbackProvider>
            <ExpandableCard>
              <IdeasSection worldId="1" accent="#a33" userRole="owner" />
            </ExpandableCard>
          </FeedbackProvider>
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

describe('IdeasSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
    localStorage.clear()
  })
  afterEach(() => cleanup())

  it('votes and unvotes an idea', async () => {
    setup()
    const dialog = await openFullscreen()
    const voteBtn = within(dialog).getAllByRole('button', { name: 'Голосувати за ідею' })[0]

    fireEvent.click(voteBtn)
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/worlds/1/ideas/1/vote/')
    })
    expect(JSON.parse(localStorage.getItem('voted-ideas-1'))).toEqual([1])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Прибрати голос' }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/worlds/1/ideas/1/unvote/')
    })
    expect(JSON.parse(localStorage.getItem('voted-ideas-1'))).toEqual([])
  })

  it('status chips filter the list in fullscreen', async () => {
    setup()
    const dialog = await openFullscreen()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Відхилена' }))
    await waitFor(() => {
      expect(within(dialog).queryByText('Портал')).toBeNull()
    })
    expect(within(dialog).queryByText('Міст')).not.toBeNull()
  })

  it('sorts by votes in top mode', async () => {
    setup()
    const dialog = await openFullscreen()
    expect(
      within(dialog)
        .getAllByText(/^(Портал|Міст)$/)
        .map((el) => el.textContent),
    ).toEqual(['Портал', 'Міст'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Топ за голосами' }))
    await waitFor(() => {
      expect(
        within(dialog)
          .getAllByText(/^(Портал|Міст)$/)
          .map((el) => el.textContent),
      ).toEqual(['Міст', 'Портал'])
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Спочатку нові' }))
    await waitFor(() => {
      expect(
        within(dialog)
          .getAllByText(/^(Портал|Міст)$/)
          .map((el) => el.textContent),
      ).toEqual(['Портал', 'Міст'])
    })
  })

  it('cycles status by clicking the badge', async () => {
    setup()
    const dialog = await openFullscreen()
    // Бейдж видно навіть для відкритої ідеї
    const badge = within(dialog).getByRole('button', { name: /Статус: Відкрита/ })
    fireEvent.click(badge)
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/worlds/1/ideas/1/', { status: 'accepted' })
    })
  })
})
