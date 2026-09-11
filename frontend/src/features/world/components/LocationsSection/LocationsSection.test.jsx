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
import LocationsSection from './LocationsSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

function mockApi() {
  api.get.mockImplementation(() => Promise.resolve({ data: [] }))
  api.post.mockResolvedValue({ data: { id: 5 } })
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <UndoProvider>
          <ExpandableCard>
            <LocationsSection worldId="1" accent="#a33" userRole="owner" />
          </ExpandableCard>
        </UndoProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('LocationsSection inline creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => cleanup())

  it('creates a location from the draft editor without a dialog', async () => {
    setup()
    fireEvent.click(screen.getByLabelText('Розгорнути картку'))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Нова локація' }))
    // Редактор чернетки — окремим порталом, без MUI Dialog
    const nameEl = await screen.findByLabelText('Назва локації')
    nameEl.textContent = 'Печера'
    fireEvent.input(nameEl, {})

    fireEvent.click(screen.getByRole('button', { name: 'Створити' }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/worlds/1/locations/', {
        name: 'Печера',
        description: '',
        category: 'other',
        x: 0,
        y: 0,
        z: 0,
      })
    })
  })
})
