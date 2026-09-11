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
import PlayersSection from './PlayersSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const players = [
  { id: 1, world: 1, nickname: 'Грім', role_note: 'Воїн', status: 'alive', avatar: null },
  { id: 2, world: 1, nickname: 'Тінь', role_note: '', status: 'dead', avatar: null },
]

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url.includes('/players/')) return Promise.resolve({ data: players })
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
            <PlayersSection worldId="1" accent="#a33" userRole="owner" />
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

describe('PlayersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => cleanup())

  it('shows status badge for non-alive players', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('Тінь')).not.toBeNull()
    })
    expect(screen.getByText('Загинув')).not.toBeNull()
  })

  it('status chips filter the list in fullscreen', async () => {
    setup()
    const dialog = await openFullscreen()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Загинув' }))
    await waitFor(() => {
      expect(within(dialog).queryByText('Грім')).toBeNull()
    })
    expect(within(dialog).queryByText('Тінь')).not.toBeNull()
  })

  it('creates a player with status', async () => {
    setup()
    const dialog = await openFullscreen()
    api.post.mockResolvedValue({ data: { id: 3 } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Додати' }))
    // Чернетка відкрилась в редакторі — окремим (другим) порталом поверх секції
    const titleEl = await screen.findByLabelText('Нікнейм гравця')
    // Нікнейм — contenteditable, друкуємо через input-події редактора
    titleEl.textContent = 'Зоря'
    fireEvent.input(titleEl, {})
    fireEvent.click(screen.getByRole('button', { name: 'Створити' }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/worlds/1/players/',
        expect.any(FormData),
      )
    })
    const payload = api.post.mock.calls[0][1]
    expect(payload.get('nickname')).toBe('Зоря')
    expect(payload.get('status')).toBe('alive')
  })
})
